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
    const client = createClient(state.credentials);
    const allStations = await client.getStations();
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
