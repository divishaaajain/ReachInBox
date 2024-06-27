export const createConfig = (url: string, accessToken: string) => {
  return {
    method: "GET",
    url: url,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };
};
