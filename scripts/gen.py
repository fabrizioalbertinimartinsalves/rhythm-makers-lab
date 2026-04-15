import crypt
import sys

password = sys.argv[1]
hashed = crypt.crypt(password, crypt.mksalt(crypt.METHOD_SHA512))
print("fabriziomartins:" + hashed)
