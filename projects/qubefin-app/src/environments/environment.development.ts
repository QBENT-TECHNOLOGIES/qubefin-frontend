export const environment = {
    production: false,
    gatewayPath: 'http://65.2.146.91:9900/services/',
    MAP_API_KEY: 'AIzaSyBMH6O__K5BpmQ-Dd3hbhhHrJ1UPfFJs3c',
    // Map ID for Advanced Markers. 'DEMO_MAP_ID' is Google's test ID; create a real one in Cloud Console > Map Management.
    MAP_ID: 'ec5efe657183906df4e86ee0',
    // Answer tracking-api calls from the in-browser mock until the backend is ready.
    useTrackingMocks: true,
    // Step-by-step integration: these tracking-api endpoints go to the real backend while the mock answers the rest.
    // Format 'METHOD path'; {x} matches one path segment. Add each endpoint here once the backend has it.
    trackingLiveEndpoints: [
      'GET me', // A1
    ],
};
