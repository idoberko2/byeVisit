/**
 * @typedef {Object} Station
 * @property {string} id - The station id
 * @property {string} name - The station name
 */

function createClient({ appApiKey }) {
    /**
     * 
     * @returns {Station[]}
     */
    async function getStations() {
        const response = await fetch('https://central.myvisit.com/CentralAPI/LocationSearch?currentPage=1&isFavorite=false&orderBy=Distance&organizationId=56&position={"lat":"32.0889","lng":"34.858","accuracy":1440}&resultsInPage=100&serviceTypeId=156&src=mvws', {
            mode: 'cors',
            headers: {
                'application-name': 'myVisit.com v3.5',
                'application-api-key': appApiKey,
                accept: 'application/json, text/plain, */*',
            }
        });
        if (!response.ok) {
            console.error('request failed with code', response.status);
            return;
        }
        const responseJson = await response.json();
        console.debug({ responseJson });
        if (!responseJson.Success) {
            console.error('failed requesting for stations');
            return;
        }

        return responseJson.Results.map(r => ({ id: r.ServiceId, name: r.City }));
    }

    if (!appApiKey) {
        throw new Error('missing api key');
    }

    return {
        getStations,
    };
}
