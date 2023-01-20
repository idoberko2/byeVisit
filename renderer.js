const Renderer = {};

(function initRenderer() {
    async function renderOpenings(state) {
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
            const filteredDates = dates.filter(d => Date.parse(d) < new Date((new Date()).setMonth((new Date()).getMonth() + NUMBER_OF_MONTHS)));
            const stationOpenings = {
                name: value,
                openings: filteredDates.map(d => ({
                    date: d,
                    times: [],
                }))
            };
            renderOpening(stationOpenings);
        }
    
        openings.removeChild(openingsHeader);
        document.getElementById('station_selection_cntnr').style.display = 'block';
    }
    
    function renderOpening(stationOpenings) {
        const openingHeader = document.createElement('header');
        openingHeader.appendChild(document.createTextNode(stationOpenings.name));
        const openingMain = document.createElement('main');
    
        if (stationOpenings.openings.length > 0) {
            const datesList = document.createElement('ul');
            stationOpenings.openings.forEach(o => {
                const dateHeader = document.createElement('header');
                dateHeader.appendChild(document.createTextNode(o.date));
    
                const dateMain = document.createElement('main');
                const timesList = document.createElement('ul');
                o.times.forEach(t => {
                    const timeItem = document.createElement('li');
                    timeItem.appendChild(document.createTextNode(t));
                    timesList.appendChild(timeItem);
                });
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
        const form = document.getElementById('station_selection');
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
    }

    function getCheckboxId(stationId) {
        return `chkbx_${stationId}`;
    }

    function getListItemId(stationId) {
        return `li_${stationId}`;
    }

    Renderer.renderStations = renderStations;
    Renderer.renderOpenings = renderOpenings;
    Renderer.getListItemId = getListItemId;
})();
