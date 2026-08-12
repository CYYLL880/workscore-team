import { Platform, Alert } from 'react-native';

// 跨平台 alert：web 端用 window.alert，原生端用 Alert.alert
export const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

// 跨平台 confirm：web 端用 window.confirm，原生端用 Alert.alert 回调
export const showConfirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: '取消', style: 'cancel' },
      { text: '确认', style: 'destructive', onPress: onConfirm },
    ]);
  }
};
