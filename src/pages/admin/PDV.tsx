import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart, Search, Minus, Plus, Trash2, X,
  CreditCard, Banknote, Smartphone, Wallet,
  CheckCircle2, Receipt, Zap, User, Package, Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePaymentCheckout } from "@/hooks/usePaymentCheckout";
import { PaymentMethodModal } from "@/components/financial/PaymentMethodModal";
import { useAuth } from "@/hooks/useAuth";

export default function PDV() {
  const queryClient = useQueryClient();
  const { studioId } = useAuth();
  const { checkout, modalOpen, setModalOpen, checkoutOptions } = usePaymentCheckout();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [clienteNome, setClienteNome] = useState("");
  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [cartItems, setCartItems] = useState<{
    produto_id: string; nome: string; quantidade: number;
    preco_unitario: number; max_estoque: number;
  }[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastSaleId, setLastSaleId] = useState("");

  const { data: produtos = [] } = useQuery<any[]>({
    queryKey: ["produtos", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("studio_id", studioId)
        .eq("ativo", true)
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: alunos = [] } = useQuery<any[]>({
    queryKey: ["alunos-select", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("studio_id", studioId)
        .eq("status", "ativo")
        .order("nome");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Focus search on mount
  useEffect(() => { searchRef.current?.focus(); }, []);

  const categories = useMemo(() => {
    const cats = new Set(produtos.map((p: any) => p.categoria || "Geral"));
    return ["todos", ...Array.from(cats)];
  }, [produtos]);

  const filteredProducts = useMemo(() => {
    return produtos.filter((p: any) => {
      if (p.estoque <= 0) return false;
      const matchSearch = !searchTerm || p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === "todos" || (p.categoria || "Geral") === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [produtos, searchTerm, selectedCategory]);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.preco_unitario * i.quantidade, 0);
  const cartQty = cartItems.reduce((sum, i) => sum + i.quantidade, 0);

  const addToCart = (p: any) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.produto_id === p.id);
      if (existing) {
        if (existing.quantidade >= p.estoque) {
          toast.error(`Estoque insuficiente para ${p.nome}`);
          return prev;
        }
        return prev.map((i) => i.produto_id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...prev, { produto_id: p.id, nome: p.nome, quantidade: 1, preco_unitario: Number(p.preco), max_estoque: p.estoque }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCartItems((prev) => prev.map((i) => {
      if (i.produto_id !== id) return i;
      const newQty = i.quantidade + delta;
      if (newQty <= 0) return i;
      if (newQty > i.max_estoque) { toast.error("Estoque insuficiente"); return i; }
      return { ...i, quantidade: newQty };
    }));
  };

  const removeItem = (id: string) => setCartItems((prev) => prev.filter((i) => i.produto_id !== id));

  const finalizeSale = useMutation({
    mutationFn: async () => {
      if (!studioId) return;
      
      // 1. Criar pedido
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert([{
          studio_id: studioId,
          cliente_nome: clienteNome || null,
          student_id: alunoId,
          valor_total: cartTotal,
          status: "fechada",
          forma_pagamento: formaPagamento || "dinheiro",
          fechada_em: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (orderErr) throw orderErr;

      // 2. Inserir itens
      const orderItems = cartItems.map(item => ({
        studio_id: studioId,
        order_id: order.id,
        product_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);
      
      if (itemsErr) throw itemsErr;

      // 3. Atualizar estoque, Logs e Vendas (Simulando transação)
      for (const item of cartItems) {
        // Baixa de estoque
        await supabase
          .from("products")
          .update({ estoque: item.max_estoque - item.quantidade, updated_at: new Date().toISOString() })
          .eq("id", item.produto_id);

        // Log de estoque
        await supabase
          .from("stock_logs")
          .insert([{
            studio_id: studioId,
            product_id: item.produto_id,
            tipo: "saida",
            quantidade: item.quantidade,
            motivo: `PDV venda #${order.id.slice(0, 8)}`
          }]);

        // Registro de venda para relatórios
        await supabase
          .from("sales")
          .insert([{
            studio_id: studioId,
            product_id: item.produto_id,
            student_id: alunoId,
            quantidade: item.quantidade,
            valor_total: item.preco_unitario * item.quantidade,
            forma_pagamento: formaPagamento || "dinheiro"
          }]);
      }

      return order.id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["produtos", studioId] });
      setLastSaleId(id || "");
      setShowConfirmation(true);
      toast.success("Venda finalizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetAll = () => {
    setCartItems([]);
    setClienteNome("");
    setAlunoId(null);
    setFormaPagamento("");
    setSearchTerm("");
    setShowConfirmation(false);
    setLastSaleId("");
    searchRef.current?.focus();
  };

  const paymentMethods = [
    { value: "online", label: "Online", icon: Zap, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { value: "dinheiro", label: "Dinheiro", icon: Banknote, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { value: "cartao_manual", label: "Cartão (Maquininha)", icon: CreditCard, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { value: "conta_aluno", label: "Conta Aluno", icon: Wallet, color: "text-purple-600 bg-purple-50 border-purple-200" },
  ];

  // Confirmation screen
  if (showConfirmation) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Venda Realizada!</h2>
              <p className="text-muted-foreground mt-1">
                Comanda #{lastSaleId.slice(0, 8)} · {formaPagamento || "dinheiro"}
              </p>
            </div>
            <div className="bg-muted/30 rounded-2xl p-6 inline-block">
              <p className="text-sm text-muted-foreground">{cartQty} {cartQty === 1 ? "item" : "itens"}</p>
              <p className="text-3xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={resetAll} className="gap-2">
                <Receipt className="h-4 w-4" /> Nova Venda
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" /> PDV — Ponto de Venda
            </h1>
            <p className="text-muted-foreground text-sm">Vendas rápidas de balcão</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: Product grid */}
          <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
            {/* Search & filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar produto... (comece a digitar)"
                  className="pl-10 h-11"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c === "todos" ? "Todas" : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredProducts.map((p: any) => {
                  const inCart = cartItems.find((i) => i.produto_id === p.id);
                  const isLow = p.estoque <= (p.estoque_minimo || 0) && (p.estoque_minimo || 0) > 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className={`relative text-left p-3 rounded-xl border-2 transition-all text-sm hover:shadow-md active:scale-[0.98] ${
                        inCart
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {inCart && (
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                          {inCart.quantidade}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mb-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{p.categoria || "Geral"}</span>
                      </div>
                      <p className="font-semibold truncate">{p.nome}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="font-bold text-primary">R$ {Number(p.preco).toFixed(2)}</span>
                        <Badge variant={isLow ? "destructive" : "secondary"} className="text-[10px] h-5">
                          {p.estoque} un
                        </Badge>
                      </div>
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="col-span-full text-center text-muted-foreground py-12">
                    Nenhum produto encontrado
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Cart */}
          <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden">
            {/* Cart header */}
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" /> Carrinho
                </h3>
                {cartItems.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => setCartItems([])}>
                    Limpar
                  </Button>
                )}
              </div>

              {/* Client selection */}
              <div className="mt-3 space-y-2">
                <Select value={alunoId || "avulso"} onValueChange={(v) => {
                  setAlunoId(v === "avulso" ? null : v);
                  if (v !== "avulso") {
                    const aluno = alunos.find((a: any) => a.id === v);
                    setClienteNome(aluno?.nome || "");
                  }
                }}>
                  <SelectTrigger className="h-9">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <SelectValue placeholder="Cliente avulso" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="avulso">Cliente avulso</SelectItem>
                    {alunos.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!alunoId && (
                  <Input
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    placeholder="Nome do cliente"
                    className="h-8 text-xs"
                  />
                )}
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 max-h-[40vh] lg:max-h-none">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Carrinho vazio</p>
                  <p className="text-xs">Clique nos produtos para adicionar</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.produto_id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">R$ {item.preco_unitario.toFixed(2)} un.</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => {
                        if (item.quantidade <= 1) removeItem(item.produto_id);
                        else updateQty(item.produto_id, -1);
                      }}>
                        {item.quantidade <= 1 ? <Trash2 className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3" />}
                      </Button>
                      <span className="w-7 text-center text-sm font-bold">{item.quantidade}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.produto_id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-bold w-18 text-right shrink-0">
                      R$ {(item.preco_unitario * item.quantidade).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Cart footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-border p-4 space-y-3 bg-muted/20 shrink-0">
                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{cartQty} {cartQty === 1 ? "item" : "itens"}</span>
                  <span className="text-xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
                </div>

                <Separator />

                {/* Payment methods */}
                <div className="grid grid-cols-4 gap-1.5">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.value}
                      onClick={() => setFormaPagamento(pm.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] font-medium transition-all ${
                        formaPagamento === pm.value
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                          : `border-border hover:border-primary/40 ${pm.color}`
                      }`}
                    >
                      <pm.icon className="h-4 w-4" />
                      {pm.label}
                    </button>
                  ))}
                </div>

                {/* Finalize buttons */}
                <div className="space-y-2">
                  <Button
                    className="w-full h-12 text-base font-bold gap-2"
                    disabled={cartItems.length === 0 || !formaPagamento || finalizeSale.isPending}
                    onClick={() => {
                        if (formaPagamento === 'online') {
                            checkout({
                                amount: cartTotal,
                                description: `PDV - ${cartQty} ${cartQty === 1 ? "item" : "itens"}`,
                                transactionId: crypto.randomUUID(),
                                metadata: { tipo: "pdv", studio_id: studioId! },
                                returnPath: "admin/pdv",
                            });
                        } else {
                            finalizeSale.mutate();
                        }
                    }}
                  >
                    {finalizeSale.isPending ? "Processando..." : (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        {formaPagamento === 'online' ? 'Pagar e Finalizar' : 'Finalizar Venda'} — R$ {cartTotal.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <PaymentMethodModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        checkoutOptions={checkoutOptions} 
        studioId={studioId!} 
        onSuccess={() => finalizeSale.mutate()}
      />
    </AdminLayout>
  );
}
