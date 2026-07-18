import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { setupPushNotifications } from '@/lib/pushNotifications';

/**
 * Registers the device for push notifications once the user is logged in,
 * and deep-links into the app when a notification is tapped.
 */
export default function PushNotificationSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    void setupPushNotifications(user.id, (data) => {
      if (data.groupId) {
        navigate(`/groups/${data.groupId}`);
      } else {
        navigate('/activity');
      }
    });
  }, [user, navigate]);

  return null;
}
