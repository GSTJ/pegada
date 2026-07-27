export let initialNotification: string | undefined;

export const setInitialNotification = (url?: string) => {
  initialNotification = url;
};
