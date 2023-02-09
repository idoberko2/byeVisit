const Renderer = {};

(function initRenderer() {
    async function renderOpenings(state, handleSelect) {
        const openings = document.getElementById('appointment_openings');
        openings.style.display = 'block';
        const openingsHeader = document.createElement('header');
        openingsHeader.appendChild(document.createTextNode(`מחפש תורים ב${NUMBER_OF_MONTHS} החודשים הקרובים...`));
        openings.insertBefore(openingsHeader, document.querySelector('#appointment_openings main'));
        const client = createClient(state.credentials);
        console.log(typeof state.selectedStations);
        for (const [key, value] of Object.entries(state.selectedStations)) {
            let dates;
            try {
                dates = await client.getDates(key);
            } catch (e) {
                if (e == ErrUnauthorized) {
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('unauthorized').style.display = 'block';
                    return;
                }
            }
            console.debug(value, { dates });
            let filteredDates = [];
            if (dates && Array.isArray(dates)) {
                const xMonthsFromNow = new Date((new Date()).setMonth((new Date()).getMonth() + NUMBER_OF_MONTHS));
                filteredDates = dates.filter(d => Date.parse(d.calendarDate) < xMonthsFromNow);
            }
            const stationOpenings = {
                name: value,
                openings: filteredDates.map(d => ({
                    stationId: key,
                    date: d,
                    timesPromise: client.getTimes(key, d.calendarId),
                }))
            };
            renderOpening(stationOpenings, handleSelect);
        }
    
        openings.removeChild(openingsHeader);
        document.getElementById('settings_container').style.display = 'block';
    }
    
    function renderOpening(stationOpenings, handleSelect) {
        const openingHeader = document.createElement('header');
        openingHeader.appendChild(document.createTextNode(stationOpenings.name));
        const openingMain = document.createElement('main');
    
        if (stationOpenings.openings.length > 0) {
            const datesList = document.createElement('ul');
            datesList.className = 'dates_list';
            stationOpenings.openings.forEach(o => {
                const dateHeader = document.createElement('header');
                dateHeader.appendChild(document.createTextNode(new Date(Date.parse(o.date.calendarDate)).toLocaleDateString('he-IL')));
    
                const dateMain = document.createElement('main');
                const timesList = document.createElement('ul');
                timesList.className = 'times_list';
                o.timesPromise.then(avlbleTimes => avlbleTimes.forEach(t => {
                    const timeItem = document.createElement('li');
                    timeItem.id = getTimeId(o.stationId, o.date.calendarDate, t.timeId);
                    timeItem.onclick = () => handleSelect(o.stationId, o.date, t.timeId);
                    timeItem.appendChild(document.createTextNode(t.humanReadableTime));
                    timesList.appendChild(timeItem);
                }));
                dateMain.appendChild(timesList);
                const dateItem = document.createElement('li');
                dateItem.appendChild(dateHeader);
                dateItem.appendChild(dateMain);
                datesList.appendChild(dateItem);
            });
            openingMain.appendChild(datesList);
        } else {
            openingMain.appendChild(document.createTextNode('אין תורים 😔'));
        }
    
        const openingItem = document.createElement('li');
        openingItem.appendChild(openingHeader);
        openingItem.appendChild(openingMain);
    
        document.getElementById('openings_list').appendChild(openingItem);
    }
    
    async function renderStations(state, handleSubmit) {
        const form = document.getElementById('settings_form');
        form.onsubmit = handleSubmit(state, form);
        const list = document.getElementById('station_list');
        state.allStations.forEach(s => {
            const checkboxId = getCheckboxId(s.id);
    
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
            item.id = getListItemId(s.id);
            item.appendChild(label);
            item.appendChild(input);
            list.appendChild(item);
        });

        const { id, phone } = state;
        if (Boolean(id)) {
            document.getElementById('id_num').value = id;
        }
        if (Boolean(phone)) {
            document.getElementById('phone_num').value = phone;
        }
    }

    function renderSubmit(handleSubmit) {
        const submitButtonId = 'appointment_submission';
        if (Boolean(document.getElementById(submitButtonId))) {
            document.getElementById(submitButtonId).onclick = handleSubmit;
            return;
        }

        const app = document.getElementById('app');
        const submitButton = document.createElement('button');
        submitButton.id = submitButtonId;
        submitButton.appendChild(document.createTextNode('קביעת תור'));
        submitButton.onclick = handleSubmit;
        app.appendChild(submitButton);
    }

    function getCheckboxId(stationId) {
        return `chkbx_${stationId}`;
    }

    function getListItemId(stationId) {
        return `li_${stationId}`;
    }

    function getTimeId(stationId, calendarDate, timeId) {
        return `t_${stationId}_${calendarDate}_${timeId}`;
    }

    Renderer.renderStations = renderStations;
    Renderer.renderOpenings = renderOpenings;
    Renderer.renderSubmit = renderSubmit;
    Renderer.getListItemId = getListItemId;
    Renderer.getTimeId = getTimeId;
})();
