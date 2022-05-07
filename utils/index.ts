export const objectToUrlParams = (obj: Record<string, any>) => {
  const params = Object.keys(obj)
    .map(key => {
      return `${key}=${obj[key]}`;
    })
    .join("&");
  return params;
};
