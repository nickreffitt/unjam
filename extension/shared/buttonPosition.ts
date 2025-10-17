export type ButtonPosition = 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right';

const STORAGE_KEY = 'unjam-button-position';
const VISIBILITY_STORAGE_KEY = 'unjam-button-visible';

export const getButtonPosition = async (): Promise<ButtonPosition> => {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as ButtonPosition) || 'bottom-right';
  } catch (error) {
    console.error('Error getting button position:', error);
    return 'bottom-right';
  }
};

export const setButtonPosition = async (position: ButtonPosition): Promise<void> => {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: position });
  } catch (error) {
    console.error('Error setting button position:', error);
  }
};

export const getNextPosition = (current: ButtonPosition): ButtonPosition => {
  const positions: ButtonPosition[] = ['bottom-right', 'top-right', 'top-left', 'bottom-left'];
  const currentIndex = positions.indexOf(current);
  return positions[(currentIndex + 1) % positions.length];
};

export const getPositionClasses = (position: ButtonPosition): string => {
  switch (position) {
    case 'bottom-right':
      return 'unjam-bottom-4 unjam-right-4';
    case 'bottom-left':
      return 'unjam-bottom-4 unjam-left-4';
    case 'top-left':
      return 'unjam-top-4 unjam-left-4';
    case 'top-right':
      return 'unjam-top-4 unjam-right-4';
  }
};

export const getPositionStyles = (position: ButtonPosition): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999
  };

  switch (position) {
    case 'bottom-right':
      return { ...base, bottom: '16px', right: '16px' };
    case 'bottom-left':
      return { ...base, bottom: '16px', left: '16px' };
    case 'top-left':
      return { ...base, top: '16px', left: '16px' };
    case 'top-right':
      return { ...base, top: '16px', right: '16px' };
  }
};

export const getButtonVisibility = async (): Promise<boolean> => {
  try {
    const result = await browser.storage.local.get(VISIBILITY_STORAGE_KEY);
    return result[VISIBILITY_STORAGE_KEY] !== false; // Default to visible
  } catch (error) {
    console.error('Error getting button visibility:', error);
    return true;
  }
};

export const setButtonVisibility = async (visible: boolean): Promise<void> => {
  try {
    await browser.storage.local.set({ [VISIBILITY_STORAGE_KEY]: visible });
  } catch (error) {
    console.error('Error setting button visibility:', error);
  }
};
