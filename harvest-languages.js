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
            $.getJSON(chrome.extension.getURL('/languages/' + locale + '.json'), resolve);
        });
    }

    function addEventListeners(select) {
        select.on('change', changeLanguage);
    }

    function appendSelect(select) {
        $('.invoice-action-buttons').prepend(select);
    }

    function getSpinner() {
        return spinner = $('<img id="harvest-language-loading" ' +
                           'src="' + chrome.extension.getURL('/content/images/spinner.gif') + '">')
            .hide();
    }

    function insertUIElements(languages) {
        var select = getSelect(languages);
        var spinner = getSpinner();
        var wrapper = getSelectWrapper(spinner, select);

        addEventListeners(select);
        appendSelect(wrapper);
    }

    function displayReadyMessage(manifest) {
        console.info(manifest.name, manifest.version, 'loaded');
    }

    function addOption(select, value, label) {
        select.append('<option value="' + value + '">' + label + '</option>');
    }

    function getSelectWrapper(spinner, select) {
        var wrapper = $('<span ' +
        'title="Change language" ' +
        'id="harvest-language-selector" ' +
        'class="btn-action btn-pill btn-invoice-action" ' +
        '></span>');

        return wrapper.append(spinner).append(select);
    }

    function getSelect(languages) {
        select = $('<select>');
        addOption(select, '*', 'Language');

        languages.forEach(function(language) {
            addOption(select, language.locale, language.name + ' - ' + language.localeName);
        });

        return select;
    }

    function getIframe(url) {
        return $('<iframe src="' + url + '"></iframe>').hide().get()[0];
    }

    function getTranslationSettingsUrl(section) {
        return 'https://' + location.hostname + '/' + section + '/configure?tab=translations';
    }

    function changeValues(section, document, language) {
        _.forEach(language[section], function (value, key) {
            var field = document.getElementById(key)

            if (!field) {
                return console.warn('Could not find field for translation. ' +
                    'Is this module enabled in your Harvest settings?. ' +
                    'Field:', key, 'Translation:', value);
            }

            field.value = value;
        });

        $(document.getElementById("translation_edit")).find("form").submit();
        updated = true;
    }

    function getSelectedLocale() {
        return select.val();
    }

    function attachIframe(iframe) {
        $(document.body).append(iframe);
    }

    function iframeLoaded(iframe, section, language, resolve) {
        if (!updated) {
            return changeValues(section, iframe.contentDocument, language);
        }

        // When the iframe fires this event for the second time it does because of the form submit being done
        resolve();
    }

    function changeLanguage() {
        $(spinner).show();
        select.hide();

        loadLanguage(getSelectedLocale()).then(translateInPlace);
    }

    function getTranslationIframe(url, section, language, resolve) {
        var iframe = getIframe(url);
        iframe.addEventListener('load', function () {
            iframeLoaded(iframe, section, language, resolve)
        });

        return iframe;
    }

    function translate(section, language) {
        return new Promise(function (resolve, reject) {
            var url    = getTranslationSettingsUrl(section);
            var iframe = getTranslationIframe(url, section, language, resolve);

            attachIframe(iframe); // Kicks-off url loading
        });
    }

    function translateInPlace(language) {
        // /invoices/1234567 -> invoices
        // /estimates/1234567 -> estimates
        var section = location.pathname.match(/[^/]+/)[0];

        translate(section, language)
            .then(function () {
                // We're done
                location.reload();
            })
    }

})(Zepto);
