# Script para automatizar a atualização do Gradle Wrapper e do Android Gradle Plugin (AGP)

# Define as versões desejadas
$gradleVersion = "9.3.1"
$agpVersion = "9.1.0"

# Caminhos dos arquivos
$gradleWrapperProperties = "android/gradle/wrapper/gradle-wrapper.properties"
$projectBuildGradle = "android/build.gradle"

Write-Host "Iniciando a atualização do Gradle Wrapper e AGP..."

# 1. Atualizar Gradle Wrapper
if (Test-Path $gradleWrapperProperties) {
    Write-Host "Atualizando $gradleWrapperProperties para Gradle $gradleVersion..."
    (Get-Content $gradleWrapperProperties) -replace "distributionUrl=.*", "distributionUrl=https\://services.gradle.org/distributions/gradle-$gradleVersion-all.zip" | Set-Content $gradleWrapperProperties
    Write-Host "Gradle Wrapper atualizado com sucesso."
} else {
    Write-Host "Erro: Arquivo $gradleWrapperProperties não encontrado. Certifique-se de estar na raiz do projeto Capacitor/Android."
    exit 1
}

# 2. Atualizar Android Gradle Plugin (AGP)
if (Test-Path $projectBuildGradle) {
    Write-Host "Atualizando $projectBuildGradle para AGP $agpVersion..."
    $content = Get-Content $projectBuildGradle -Raw
    $updatedContent = $content -replace 
        '(classpath\s+["|"])com.android.tools.build:gradle:([0-9.]+)(["|"])',
        "`$1com.android.tools.build:gradle:$agpVersion`$3"
    $updatedContent | Set-Content $projectBuildGradle
    Write-Host "AGP atualizado com sucesso."
} else {
    Write-Host "Erro: Arquivo $projectBuildGradle não encontrado. Certifique-se de estar na raiz do projeto Capacitor/Android."
    exit 1
}

Write-Host "Atualização concluída. Lembre-se de sincronizar o projeto no Android Studio e verificar a versão do JDK (preferencialmente Java 21 ou 25)."
