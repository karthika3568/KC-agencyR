import { createNavigationContainerRef, DrawerActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    try {
      navigationRef.navigate('Main', { screen: name, params });
    } catch {
      navigationRef.navigate(name, params);
    }
  }
}

export function openDrawer() {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(DrawerActions.openDrawer());
  }
}
