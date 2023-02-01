/**
 * @typedef {Object} Station
 * @property {string} id - The station id
 * @property {string} name - The station name
 */

const ErrUnauthorized = new Error('unauthorized');
const ErrSetAppointmentFailed = new Error('failed to set appointment');

function createClient({ appApiKey }) {
    /**
     * 
     * @returns {Station[]}
     */
    async function getStations() {
        const url = 'https://central.myvisit.com/CentralAPI/LocationSearch?currentPage=1&isFavorite=false&orderBy=Distance&organizationId=56&position={"lat":"32.0889","lng":"34.858","accuracy":1440}&resultsInPage=100&serviceTypeId=156&src=mvws';
        const response = await fetchUrl(appApiKey, url);

        return response.Results.map(r => ({ id: r.ServiceId, name: r.City }));
    }

    async function getDates(stationId) {
        const today = new Date();
        const todayFmt = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0'),
        ].join('-')

        const url = `https://central.myvisit.com/CentralAPI/SearchAvailableDates?maxResults=31&serviceId=${stationId}&startDate=${todayFmt}`;
        const response = await fetchUrl(appApiKey, url);

        if (!response.Results) {
            return [];
        }

        return response.Results.map(r => ({ calendarDate: r.calendarDate, calendarId: r.calendarId }));
    }

    async function getTimes(stationId, dateId) {
        const url = `https://central.myvisit.com/CentralAPI/SearchAvailableSlots?ServiceId=${stationId}&CalendarId=${dateId}`;
        const response = await fetchUrl(appApiKey, url);

        if (!response.Results) {
            return [];
        }

        return response.Results.map(r => ({ timeId: r.Time, humanReadableTime: parseHumanReadableTime(r.Time) }));
    }

    async function setAppointment(visitId, stationId, date, timeId) {
        const url = `https://central.myvisit.com/CentralAPI/AppointmentSet?ServiceId=${stationId}` + 
        `&appointmentDate=${date}` +
        `&appointmentTime=${timeId}` +
        `&preparedVisitId=${visitId}` +
        `&position={"lat":"32.0889","lng":"34.858","accuracy":1440}`;
        const response = await fetchUrl(appApiKey, url);

        if (!response.Success) {
            throw ErrSetAppointmentFailed;
        }
    }

    if (!appApiKey) {
        throw new Error('missing api key');
    }

    return {
        getStations,
        getDates,
        getTimes,
        setAppointment,
    };
}

async function fetchUrl(appApiKey, url) {
    const response = await fetch(url, {
        mode: 'cors',
        headers: {
            'application-name': 'myVisit.com v3.5',
            'application-api-key': appApiKey,
            accept: 'application/json, text/plain, */*',
        }
    });
    if (response.status == 401) {
        throw ErrUnauthorized;
    }
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

    return responseJson;
}

function parseHumanReadableTime(time) {
    const minutes = time % 60;
    const hours = (time - minutes) / 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
