(async function main(state) {
    function renderStationSelector() {
        let selectStationsContainer = document.getElementById('select_stations');
        selectStationsContainer.innerText = 'Select from the list...';
    }

    chrome.storage.local.get('stations', stations => {
        if (stations != null && stations.length > 0) {
            renderStations(stations);
        } else {
            renderStationSelector();
        }
    });

    chrome.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
            if (request.type == 'CREDENTIALS_SET') {
                loadCredentials(state);
            }
            sendResponse();
        }
    );

    await loadCredentials(state);
    console.debug({state});
    setTimeout(async () => await renderStations(state), 10000);
})({});

function submitSelectedStations() {
    let stations = [];
    let stationIds = [];

    chrome.storage.local.set({ stations: stationIds }, () => {
        renderStations(stations);
    });
}

function loadCredentials(state) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('credentials', data => {
            console.debug('received credentials from storage', data.credentials);
            state.credentials = data.credentials;
            resolve();
        });
    }) 
}

async function renderStations(state) {
    if (!state.credentials) {
        console.debug('missing credentials');
        return;
    }
    
    if (!state.credentials.cookie) {
        console.debug('credentials', state.credentials)
        console.debug('missing cookie');
        return;
    }
    if (!state.credentials.appApiKey) {
        console.debug('missing app api key');
        return;
    }

    const response = await fetch('https://central.myvisit.com/CentralAPI/LocationSearch?currentPage=1&isFavorite=false&orderBy=Distance&organizationId=56&position={"lat":"32.0889","lng":"34.858","accuracy":1440}&resultsInPage=100&serviceTypeId=156&src=mvws', {
        mode: 'cors',
        headers: {
            'application-name': 'myVisit.com v3.5',
            'application-api-key': state.credentials.appApiKey,
            accept: 'application/json, text/plain, */*',
        }
    });
    if (!response.ok) {
        console.error('request failed with code', response.status);
        return;
    }
    const responseJson = await response.json();
    console.debug({responseJson});
    if (!responseJson.Success) {
        console.error('failed requesting for stations');
        return;
    }

    console.log({ stations: responseJson.Results.map(r => ({ id: r.ServiceId, name: r.City })) });
}
