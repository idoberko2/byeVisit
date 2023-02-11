/**
 * @typedef {Object} Station
 * @property {string} id - The station id
 * @property {string} name - The station name
 */

/**
 * @typedef {Object} ScheduledAppointment
 * @property {string} visitId - The visit id
 * @property {string} stationName - The station name
 * @property {Date} date - The appointment date
 */

const ErrUnauthorized = new Error('unauthorized');
const ErrPrepareVisitFailed = new Error('failed to prepare visit');
const ErrSetAppointmentFailed = new Error('failed to set appointment');

const BASE_HEADERS = {
    'application-name': 'myVisit.com v3.5',
    accept: 'application/json, text/plain, */*',
}

function createClient({ appApiKey }, handleUnauthorized) {
    /**
     * 
     * @returns {Station[]}
     */
    async function getStations() {
        const url = 'https://central.myvisit.com/CentralAPI/LocationSearch?currentPage=1&isFavorite=false&orderBy=Distance&organizationId=56&position={"lat":"32.0889","lng":"34.858","accuracy":1440}&resultsInPage=100&serviceTypeId=156&src=mvws';
        const response = await sendGet(appApiKey, url);

        return response.Results.map(r => ({ id: r.ServiceId, name: r.City }));
    }

    /**
     * 
     * @returns {ScheduledAppointment?}
     */
    async function getScheduledAppointment() {
        const todayFmt = getFormattedToday();
        const url = `https://central.myvisit.com/CentralAPI/User/Visits/?$orderby=ReferenceDate desc&$filter=ReferenceDate ge ${todayFmt}`;
        const response = await sendGet(appApiKey, url);

        if (!response.Success) {
            return [];
        }

        const scheduledApt = response.Data
            .filter(a => a.OrganizationId == 56)
            .find(a => a.CancellationAllowed);

        if (!Boolean(scheduledApt)) {
            return null;
        }

        return {
            visitId: scheduledApt.VisitId,
            stationName: scheduledApt.LocationName,
            date: new Date(Date.parse(scheduledApt.ReferenceDate)),
        }
    }

    async function getDates(stationId) {
        const todayFmt = getFormattedToday();

        const url = `https://central.myvisit.com/CentralAPI/SearchAvailableDates?maxResults=31&serviceId=${stationId}&startDate=${todayFmt}`;
        const response = await sendGet(appApiKey, url);

        if (!response.Results) {
            return [];
        }

        return response.Results.map(r => ({ calendarDate: r.calendarDate, calendarId: r.calendarId }));
    }

    async function getTimes(stationId, dateId) {
        const url = `https://central.myvisit.com/CentralAPI/SearchAvailableSlots?ServiceId=${stationId}&CalendarId=${dateId}`;
        const response = await sendGet(appApiKey, url);

        if (!response.Results) {
            return [];
        }

        return response.Results.map(r => ({ timeId: r.Time, humanReadableTime: parseHumanReadableTime(r.Time) }));
    }

    async function prepareVisit(id, phone) {
        const prepare = await sendPost(appApiKey, 'https://central.myvisit.com/CentralAPI/Organization/56/PrepareVisit');
        if (!prepare.Success) {
            console.info('failed initial preparation');
            throw ErrPrepareVisitFailed;
        }

        const visitId = prepare.Data.PreparedVisitId;
        const visitToken = prepare.Data.PreparedVisitToken;

        const idAnswer = await sendPost(appApiKey, `https://central.myvisit.com/CentralAPI/PreparedVisit/${visitToken}/Answer`, {
            PreparedVisitToken: visitToken,
            QuestionnaireItemId: 1674,
            QuestionId: 113,
            AnswerIds: null,
            AnswerText: id,
        });
        if (!idAnswer.Success) {
            console.info('failed answering for id');
            throw ErrPrepareVisitFailed;
        }

        const phoneAnswer = await sendPost(appApiKey, `https://central.myvisit.com/CentralAPI/PreparedVisit/${visitToken}/Answer`, {
            PreparedVisitToken: visitToken,
            QuestionnaireItemId: 1675,
            QuestionId: 114,
            AnswerIds: null,
            AnswerText: phone,
        });
        if (!phoneAnswer.Success) {
            console.info('failed answering for phone');
            throw ErrPrepareVisitFailed;
        }

        return visitId;
    }

    async function setAppointment(visitId, stationId, date, timeId) {
        const url = `https://central.myvisit.com/CentralAPI/AppointmentSet?ServiceId=${stationId}` +
            `&appointmentDate=${date}` +
            `&appointmentTime=${timeId}` +
            `&preparedVisitId=${visitId}` +
            `&position={"lat":"32.0889","lng":"34.858","accuracy":1440}`;
        const response = await sendGet(appApiKey, url);

        if (!response.Success) {
            throw ErrSetAppointmentFailed;
        }
    }

    if (!appApiKey) {
        throw new Error('missing api key');
    }

    async function sendGet(appApiKey, url) {
        const response = await fetch(url, {
            mode: 'cors',
            headers: {
                ...BASE_HEADERS,
                'application-api-key': appApiKey,
            }
        });
        return handleResponse(response);
    }
    
    async function sendPost(appApiKey, url, body) {
        const response = await fetch(url, {
            mode: 'cors',
            headers: {
                ...BASE_HEADERS,
                'application-api-key': appApiKey,
                'content-type': 'application/json',
            },
            method: 'POST',
            body: body && JSON.stringify(body),
        });
        return handleResponse(response);
    }
    
    async function handleResponse(response) {
        if (response.status == 401) {
            handleUnauthorized();
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

    return {
        getStations,
        getScheduledAppointment,
        getDates,
        getTimes,
        prepareVisit,
        setAppointment,
    };
}

function parseHumanReadableTime(time) {
    const minutes = time % 60;
    const hours = (time - minutes) / 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function getFormattedToday() {
    const today = new Date();
    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
    ].join('-');
}
