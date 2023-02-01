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

    if (!isInitialized(state)) {
        console.debug('not initialized', state);
        gettingStartedFlow();
    } else {
        await Renderer.renderOpenings(state, createSelectHandler(state));
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

async function loadStations(state) {
    await loadFromStorage(state, 'allStations');
    if (!state.allStations || state.allStations.length == 0) {
        const loadTxt = document.createTextNode('טוען לשכות...');
        const stationLoader = document.getElementById('station_loader');
        stationLoader.appendChild(loadTxt);
        const client = createClient(state.credentials);
        const allStations = await client.getStations();

        chrome.storage.local.set({ allStations }, () => {
            console.debug('set allStations', allStations);
        });
        state.allStations = allStations;
        document.getElementById('station_loader').removeChild(loadTxt);
    }

    await loadFromStorage(state, 'selectedStations');
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

        document.getElementById('edit_station_selection').style.display = 'block';

        return false;
    }
}

function isInitialized(state) {
    return state.selectedStations && Object.entries(state.selectedStations).length > 0;
}

function gettingStartedFlow() {
    document.getElementById('station_selection_cntnr').style.display = 'block';
    document.getElementById('station_selection').style.display = 'block';
    document.getElementById('edit_station_selection').style.display = 'none';
}

function createSelectHandler(state) {
    return function selectHandler(calendarId, timeId) {
        if (state.selected) {
            document.getElementById(Renderer.getTimeId(state.selected.calendarId, state.selected.timeId)).classList.remove('selected');
        }
        state.selected = { calendarId, timeId };
        document.getElementById(Renderer.getTimeId(calendarId, timeId)).classList.add('selected');
        Renderer.renderSubmit(createSetAppointmentHandler(calendarId, timeId));
    }
}

function createSetAppointmentHandler(calendarId, timeId) {
    return function setAppointmentHandler() {
        console.info(calendarId, timeId);
    }
}
