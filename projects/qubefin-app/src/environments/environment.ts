export const environment = {
    production: true,
    gatewayPath: 'http://15.206.8.100/services/',
    // Google Maps key for the production domain (restrict it by HTTP referrer).
    MAP_API_KEY: '',
    MAP_ID: '',
    useTrackingMocks: false,
    // Live GPS / alarm socket (see environment.development.ts). Empty = polling only; set it when production has one.
    liveSocketUrl: '',
    // GPS service for today's trail on Live Tracking (see environment.development.ts). Empty = no trail.
    gpsServiceUrl: '',
};
