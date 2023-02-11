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
    await loadSettings(state);
    await setScheduledAptToState(state);
    await Renderer.renderStations(state, selectedStationsPersistor);

    if (!isInitialized(state)) {
        console.debug('not initialized', state);
        gettingStartedFlow();
    } else {
        await Renderer.renderOpenings(
            state,
            generateOpeningDatesGetter(state),
            generateOpeningTimesGetter(state),
            createSelectHandler(state),
        );
    }

    document.getElementById('edit_station_selection').onclick = () => {
        const form = document.getElementById('settings_form');
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

async function loadSettings(state) {
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
    await loadFromStorage(state, 'id');
    await loadFromStorage(state, 'phone');
}

async function setScheduledAptToState(state) {
    const scheduledApt = await createClient(state.credentials).getScheduledAppointment();
    console.debug({ scheduledApt });
    state.scheduledApt = scheduledApt;
}

function generateOpeningDatesGetter(state) {
    const client = createClient(state.credentials);
    return async function getOpeningDates(stationId) {
        try {
            const dates = await client.getDates(stationId);
            console.debug(stationId, { dates });
            return dates;
        } catch (e) {
            if (e == ErrUnauthorized) {
                document.getElementById('app').style.display = 'none';
                document.getElementById('unauthorized').style.display = 'block';
                return [];
            }
        }
    }
}

function generateOpeningTimesGetter(state) {
    const client = createClient(state.credentials);
    return function getOpeningTimes(stationId, calendarId) {
        return client.getTimes(stationId, calendarId);
    }
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
        const selectedValues = Array.from(selected).reduce((prev, curr) => {
            const stationId = curr.value;
            const label = document.querySelector(`#${Renderer.getListItemId(stationId)} label`)
            return ({ ...prev, [stationId]: label.innerText });
        }, {});
        console.debug({ selectedValues });
        form.style.display = 'none';

        chrome.storage.local.set({ selectedStations: selectedValues }, () => {
            state.selectedStations = selectedValues;
        });

        const id = document.getElementById('id_num').value, phone = document.getElementById('phone_num').value;
        if (Boolean(id)) {
            chrome.storage.local.set({ id }, () => {
                state.id = id;
            });
        }
        if (Boolean(phone)) {
            chrome.storage.local.set({ phone }, () => {
                state.phone = phone;
            });
        }

        document.getElementById('edit_station_selection').style.display = 'block';

        return false;
    }
}

function isInitialized(state) {
    return state.selectedStations && Object.entries(state.selectedStations).length > 0;
}

function gettingStartedFlow() {
    document.getElementById('settings_container').style.display = 'block';
    document.getElementById('settings_form').style.display = 'block';
    document.getElementById('edit_station_selection').style.display = 'none';
}

function createSelectHandler(state) {
    return function selectHandler(stationId, date, timeId) {
        if (state.selected) {
            document.getElementById(Renderer.getTimeId(state.selected.stationId, state.selected.date.calendarDate, state.selected.timeId)).classList.remove('selected');
        }
        state.selected = { stationId, date, timeId };
        document.getElementById(Renderer.getTimeId(stationId, date.calendarDate, timeId)).classList.add('selected');
        Renderer.renderSubmit(createSetAppointmentHandler(state, stationId, date.calendarDate, timeId));
    }
}

function createSetAppointmentHandler(state, stationId, calendarDate, timeId) {
    return async function setAppointmentHandler() {
        console.debug(stationId, calendarDate, timeId);
        if (!Boolean(state.id) || !Boolean(state.phone)) {
            console.error('cannot set appointment when id or phone are missing!');
            return;
        }

        const client = createClient(state.credentials);
        try {
            const visitId = await client.prepareVisit(state.id, state.phone);
            await client.setAppointment(visitId, stationId, calendarDate, timeId);
            console.debug('success');
        } catch (e) {
            console.error(e);
        }
    }
}
