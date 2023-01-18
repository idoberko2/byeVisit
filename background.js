chrome.webRequest.onSendHeaders.addListener(
    (details) => {
        console.debug('getting credentials...');
        const credentials = {};
        details.requestHeaders.forEach(header => {
            if (header.name.toLowerCase() == 'cookie') {
                credentials.cookie = header.value;
                console.debug('got cookie');
            }
            if (header.name.toLowerCase() == 'application-api-key') {
                credentials.appApiKey = header.value;
                console.debug('got app api key');
            }

            let success = true;
            if (!credentials.cookie) {
                console.debug('did not find cookie header');
                success = false;
            }
            if (!credentials.appApiKey) {
                console.debug('did not find appApiKey header');
                success = false;
            }
            if (!success) {
                return;
            }

            chrome.storage.local.set({ credentials }, () => {
                console.debug('credentials set');
                chrome.runtime.sendMessage({ type: 'CREDENTIALS_SET' }, (response) => {});
            });
        });
    },
    { urls: ['https://central.myvisit.com/CentralAPI/UserGetInfo?useCookie=false'] }, ['requestHeaders', 'extraHeaders']);

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.type == 'INIT_COMPLETE') {
            console.log('do something...');
        }
        sendResponse();
    }
);
