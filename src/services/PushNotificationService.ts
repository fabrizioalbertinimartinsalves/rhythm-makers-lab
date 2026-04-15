import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

export class PushNotificationService {
  private static async getUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  static async initialize() {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push Notifications: Not on a native platform, skipping registration.');
      return;
    }

    console.log('Push Notifications: Initializing...');

    // Request permissions
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      console.warn('Push Notifications: Permission denied.');
      return;
    }

    // Register with FCM
    await PushNotifications.register();

    // Listeners
    this.addListeners();
  }

  private static addListeners() {
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push Notifications: Registered token:', token.value);
      await this.saveToken(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push Notifications: Error on registration:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push Notifications: Notification received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push Notifications: Action performed:', action);
      // Aqui você pode redirecionar o usuário para uma página específica
    });
  }

  private static async saveToken(token: string) {
    const userId = await this.getUserId();
    if (!userId) {
      console.warn('Push Notifications: No user logged in, cannot save token.');
      return;
    }

    console.log('Push Notifications: Saving token to database for user:', userId);

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        { 
          user_id: userId, 
          token: token, 
          platform: 'android',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      console.error('Push Notifications: Error saving token to DB:', error);
    } else {
      console.log('Push Notifications: Token saved successfully.');
    }
  }
}
