(function($) {
    'use strict';
    var select, spinner, updated;

    init();

    ///

    function init() {
        loadLanguages().then(insertUIElements);
        loadManifest().then(displayReadyMessage);
    }

    function loadManifest() {
        return new Promise(function(resolve, reject) {
            return resolve(chrome.runtime.getManifest());
        });
    }

    function loadLanguages() {
        return new Promise(function(resolve, reject) {
            $.getJSON(chrome.extension.getURL('/languages.json'), resolve);
        });
    }

    function loadLanguage(locale) {
        return new Promise(function(resolve, reject) {
            $.getJSON(chrome.extension.getURL('/languages/' + locale + '_estimates.json'), resolve);
        });
    }

    function addEventListeners(select) {
        select.addEventListener('change', changeLanguage);
    }

    function appendSelect(select) {
        $('.invoice-action-buttons').prepend(select);
    }

    function getSpinner() {
        return spinner = $('<img class="spinner" src="' + chrome.extension.getURL('/content/images/spinner.gif') + '">')
            .hide();
    }

    function appendSpinner(loader) {
        $('.invoice-action-buttons').prepend(loader);
    }

    function insertUIElements(languages) {
        var select = getSelect(languages);
        var spinner = getSpinner();

        addEventListeners(select);
        appendSelect(select);
        appendSpinner(spinner);
    }

    function displayReadyMessage(manifest) {
        console.info(manifest.name, manifest.version, 'loaded');
    }

    function addOption(select, value, label) {
        $(select).append('<option value="' + value + '">' + label + '</option>');
    }

    function getSelect(languages) {
        select = document.createElement('select');
        addOption(select, '*', 'Language');

        languages.forEach(function(language) {
            addOption(select, language.locale, language.name + ' - ' + language.localeName);
        });

        return select;
    }

    function getIframe(url) {
        return $('<iframe src="' + url + '"></iframe>').hide().get()[0];
    }

    function getTranslationSettingsUrl() {
        return 'https://' + location.hostname + '/estimates/configure#translation_edit';
    }

    function changeValues(document, language, submit) {
        _.forEach(language.translation, function(value, key) {
            document.getElementById(key).value = value;
        });

        document.getElementById('save-translations-button').click();
        updated = true;
    }

    function getSelectedLocale() {
        return select.options[select.selectedIndex].value;
    }

    function findObject(iframe, id, interval, retries) {
        var _interval, count = 0;
        return new Promise(function(resolve, reject) {
            function retry() {
                count++;
                var element = iframe.contentDocument.getElementById(id);
                if (element || count >= retries) {
                    clearInterval(_interval);
                }

                if (element) {
                    return resolve(element);
                }

                if (count >= retries) {
                    debugger;
                    return reject();
                }
            }

            _interval = setInterval(retry, interval);
        });
    }

    function addIframeListeners(iframe, language) {
        iframe.addEventListener('load', function() {
            iframeLoaded(iframe, language)
        });
    }

    function attachIframe(iframe) {
        $(document.body).append(iframe);
    }

    function createIframe() {
        var url = getTranslationSettingsUrl();
        return getIframe(url);
    }

    function iframeLoaded(iframe, language) {
        if (!updated) {
            return changeValues(iframe.contentDocument, language);
        }

        // We're done
        location.reload();
    }

    function changeLanguage() {
        $(spinner).show();

        var locale = getSelectedLocale();
        loadLanguage(locale)
            .then(function(language) {
                var iframe = createIframe();
                addIframeListeners(iframe, language);
                attachIframe(iframe); // Kicks-off url loading
            });
    }

})(Zepto);
