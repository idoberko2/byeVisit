chrome.webRequest.onSendHeaders.addListener(
    async details => {
        console.debug('getting credentials...');
        if (!details.requestHeaders) {
            return;
        }

        const credentials = await loadCredentialsFromStorage() || {};
        let updatedApiKey = false;
        for (header of details.requestHeaders) {
            if (header.name.toLowerCase() == 'application-api-key' && header.value != credentials.appApiKey) {
                credentials.appApiKey = header.value;
                console.debug('got fresh app api key');
                updatedApiKey = true;
            }
        }

        if (!updatedApiKey) {
            console.debug('did not find appApiKey header');
            return;
        }

        chrome.storage.local.set({ credentials }, () => {
            console.debug('credentials set');
            chrome.runtime.sendMessage({ type: 'CREDENTIALS_SET' }, (response) => {});
        });
    },
    { urls: ['https://central.myvisit.com/CentralAPI/*'] }, ['requestHeaders', 'extraHeaders']);

function loadCredentialsFromStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('credentials', data => {
            console.debug('received credentials from storage', data.credentials);
            resolve(data.credentials);
        });
    })
}
