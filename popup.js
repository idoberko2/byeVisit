const NUMBER_OF_MONTHS = 3;

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
    await Renderer.renderStations(state, selectedStationsPersistor);

    if (!state['selectedStations'] || state['selectedStations'].length == 0) {
        document.getElementById('station_selection').style.display = 'block';
    } else {
        await Renderer.renderOpenings(state);
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
            resolve(data[property]);
        });
    })
}

function selectedStationsPersistor(state, form) {
    return async function persistSelectedStations(e) {
        e.preventDefault();
        const selected = document.querySelectorAll('ul#station_list input[type="checkbox"]:checked');
        const selectedValues = [...selected].reduce((prev, curr) => {
            const stationId = curr.value;
            const label = document.querySelector(`#${Renderer.getListItemId(stationId)} label`)
            return ({ ...prev, [stationId]: label.innerText });
        });
        console.debug({ selectedValues });
        form.style.display = 'none';

        chrome.storage.local.set({ selectedStations: selectedValues }, () => {
            state.selectedStations = selectedValues;
        });

        return false;
    }
}
