chrome.webRequest.onSendHeaders.addListener(
    (details) => {
        console.debug('getting credentials...');
        if (!details.requestHeaders) {
            return;
        }
        
        const credentials = {};
        details.requestHeaders.forEach(header => {
            if (header.name.toLowerCase() == 'application-api-key') {
                credentials.appApiKey = header.value;
                console.debug('got app api key');
            }

            if (!credentials.appApiKey) {
                console.debug('did not find appApiKey header');
                return;
            }

            chrome.storage.local.set({ credentials }, () => {
                console.debug('credentials set');
                chrome.runtime.sendMessage({ type: 'CREDENTIALS_SET' }, (response) => {});
            });
        });
    },
    // { urls: ['https://central.myvisit.com/CentralAPI/UserGetInfo?useCookie=false'] }, ['requestHeaders', 'extraHeaders']);
    { urls: ['https://central.myvisit.com/CentralAPI/UserGetInfo?useCookie=false'] }, );

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        if (request.type == 'INIT_COMPLETE') {
            console.log('do something...');
        }
        sendResponse();
    }
);
