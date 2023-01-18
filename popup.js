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
    console.debug({ state });
    await renderStations(state);

    if (!state['selectedStations'] || state['selectedStations'].length == 0) {
        document.getElementById('station_selection').style.display = 'block';
    }

    document.getElementById('edit_station_selection').onclick = () => {
        const form = document.getElementById('station_selection');
        if (form.style.display == 'block') {
            form.style.display = 'none';
        } else {
            form.style.display = 'block';
        }
    }
})({});

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

function selectedStationsPersistor(state, form) {
    return async function persistSelectedStations(e) {
        e.preventDefault();
        const selected = document.querySelectorAll('ul#station_list input[type="checkbox"]:checked');
        const selectedValues = [...selected].reduce((prev, curr) => ({ ...prev, [curr.value]: true }));
        console.debug({ selectedValues });
        form.style.display = 'none';

        chrome.storage.local.set({ selectedStations: selectedValues }, () => {
            state.selectedStations = selectedValues;
        });

        return false;
    }
}

async function renderStations(state) {
    const client = createClient(state.credentials);
    const allStations = await client.getStations();
    const form = document.getElementById('station_selection');
    form.onsubmit = selectedStationsPersistor(state, form);
    const list = document.getElementById('station_list');
    allStations.forEach(s => {
        const checkboxId = 'chkbx_' + s.id;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = s.id;
        input.id = checkboxId;
        if (state.selectedStations && state.selectedStations[s.id]) {
            input.checked = true;
        }

        const labelTxt = document.createTextNode(s.name);
        const label = document.createElement('label');
        label.for = checkboxId;
        label.value = s.id;
        label.appendChild(labelTxt);

        const item = document.createElement('li');
        item.appendChild(label);
        item.appendChild(input);
        list.appendChild(item);
    });
}
