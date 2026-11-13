export const environment = {
    production: false,
    gatewayPath: 'http://65.2.146.91:9900/services/',
    MAP_API_KEY: 'AIzaSyBMH6O__K5BpmQ-Dd3hbhhHrJ1UPfFJs3c',
    // Map ID for Advanced Markers. 'DEMO_MAP_ID' is Google's test ID; create a real one in Cloud Console > Map Management.
    MAP_ID: 'ec5efe657183906df4e86ee0',
    // Answer tracking-api calls from the in-browser mock until the backend is ready.
    useTrackingMocks: true,
    // Step-by-step integration: these tracking-api endpoints go to the real backend while the mock answers the rest.
    // Format 'METHOD path'; {x} matches one GUID segment. Add each endpoint here once the backend has it.
    trackingLiveEndpoints: [
      'GET organization-units', // A2 (contract: branches)
      'GET field-officers', // A3
      'POST jobs/search', // B1
      'GET jobs/{id}', // B2
      'GET jobs/{id}/history', // B3
      'GET jobs/task-points', // B4
      'GET geo-tags/points', // B5
      'POST jobs', // C1
      'POST jobs/{id}/tasks', // C2
      'PUT jobs/{id}/transfer', // C3
      'PUT jobs/{id}/extend', // C4
      'PUT jobs/{id}/cancel', // C5
      'PUT jobs/{id}/tasks/{taskId}/cancel', // C6
      'PUT jobs/{id}/tasks/{taskId}/reject', // C7
      'GET geo-tags', // E1 (Geo Tags page)
    ],
};
