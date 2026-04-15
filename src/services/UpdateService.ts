import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

/**
 * SERVIÇO DE ATUALIZAÇÃO OTA (Over-The-Air)
 * 
 * Este serviço gerencia o download e aplicação de novas versões do código web
 * diretamente da VPS, sem necessidade de reinstalar o APK.
 */
export class UpdateService {
  private static readonly UPDATE_URL = 'http://95.111.250.154/updates/version.json';

  static async requestPermissions() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Filesystem.requestPermissions();
    } catch (e) {
      console.warn('Erro permissões:', e);
    }
  }

  static async checkForUpdates(isManual = false) {
    if (!Capacitor.isNativePlatform()) {
      if (isManual) {
        console.log('Update check ignored on non-native platform.');
      }
      return;
    }

    try {
      if (isManual) console.log('OTA Service: Checking for updates...');
      
      const response = await CapacitorHttp.get({
        url: this.UPDATE_URL,
        params: { t: Date.now().toString() } // Forçar bypass de cache
      });

      if (response.status !== 200) {
        if (isManual) console.warn('OTA Service: Server offline or error ' + response.status);
        return;
      }
      
      const updateInfo = response.data;
      const current = await CapacitorUpdater.current();
      const currentVersion = current.bundle?.version || 'original';
      
      if (isManual) console.log(`OTA Service: Version Local: ${currentVersion} | Cloud: ${updateInfo.version}`);

      if (updateInfo.version !== currentVersion) {
        // Here we can still use a confirm or a toast to let the user know a download is happening
        console.log(`Difference detected! Downloading ${updateInfo.version}...`);

        let bundle;
        try {
          bundle = await CapacitorUpdater.download({
            url: updateInfo.url,
            version: updateInfo.version,
          });
        } catch (downloadErr: any) {
          console.error('Download error:', downloadErr);
          return;
        }

        const confirmReset = confirm(`Nova atualização disponível (${updateInfo.version}).\nDeseja aplicar e reiniciar agora?`);
        
        if (confirmReset) {
          await CapacitorUpdater.set(bundle);
          CapacitorUpdater.reload();
        }
      } else {
        if (isManual) console.log('OTA Service: Already on latest version.');
      }
    } catch (err: any) {
      console.error('OTA Critical Error:', err);
    }
  }
}
