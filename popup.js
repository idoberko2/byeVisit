(async function main(state) {
    chrome.runtime.onMessage.addListener(
        (request, sender, sendResponse) => {
            if (request.type == 'CREDENTIALS_SET') {
                loadCredentials(state);
            }
            sendResponse();
        }
    );

    await loadCredentials(state);
    await loadStations(state);
    console.debug({state});

    if (!state['selectedStations'] || state['selectedStations'].length == 0) {
        await renderStations(state);
    }
    
    // setTimeout(async () => await renderStations(state), 10000);
})({});

function submitSelectedStations() {
    let stations = [];
    let stationIds = [];

    chrome.storage.local.set({ stations: stationIds }, () => {
        renderStations(stations);
    });
}

function loadCredentials(state) {
    return loadFromStorage(state, 'credentials');
}

function loadStations(state) {
    return loadFromStorage(state, 'selectedStations');
}

function loadFromStorage(state, property) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(property, data => {
            console.debug('received ' + property + ' from storage', data[property]);
            state[property] = data[property];
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

    const allStations = responseJson.Results.map(r => ({ id: r.ServiceId, name: r.City }));
    console.debug({ allStations });
    const form = document.getElementById('station_selection');
    form.style.display = 'block';
    const list = document.getElementById('station_list');
    allStations.forEach(s => {
        const checkboxId = 'chkbx_' + s.id;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = s.id;
        input.id = checkboxId;

        const labelTxt = document.createTextNode(s.name);
        const label = document.createElement('label');
        label.for = checkboxId;
        label.value = s.id;
        label.appendChild(labelTxt);
        
        const item = document.createElement('li');
        item.appendChild(label);
        item.appendChild(input);
        console.debug('adding list item', item);
        list.appendChild(item);
    });
}
