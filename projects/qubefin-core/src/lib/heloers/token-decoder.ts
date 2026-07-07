export function tokenDecoder(token: string) {
    if (!token) return {};

    const decodedToken = (token: string): any => {
        try {
            return JSON.parse(atob(token));
        } catch {
            return;
        }
    }

    return token
        .split('.')
        .map(token => decodedToken(token))
        .reduce((acc, cur) => {
            if (!!cur) {
                acc = { ...acc, ...cur };
            }
            return acc;
        }, Object.create(null));
}