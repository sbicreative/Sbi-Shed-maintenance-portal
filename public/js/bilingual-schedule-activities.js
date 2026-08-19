(function attachBilingualScheduleActivities(globalObject) {
    const activityPattern = /^(?:check(?:ing)?|inspect|examine|ensure|verify|test|clean|calibrate|measure|record|replace|renew|grease|lubricate|tighten|remove|refit|fit|provide|apply|drain|refill|top\s*up|match|working|condition|status|operation)\b/i;

    function clean(value) {
        return String(value || "")
            .replace(/&amp;/g, "&")
            .replace(/\s+/g, " ")
            .trim();
    }

    const verifiedTranslations = new Map([
        ["Clean the surfaces of the driver’s desk with a soap solution and cloth, taking care not to allow water to enter electrical cubicles.", "ड्राइवर डेस्क की सतहों को साबुन के घोल और कपड़े से साफ करें। ध्यान रखें कि विद्युत क्यूबिकल में पानी प्रवेश न करे।"],
        ["Clean the dust filter on the buzzer using a soft brush without using the pressure / compressed air.", "दबाव वाली या संपीड़ित हवा का उपयोग किए बिना मुलायम ब्रश से बजर का डस्ट फिल्टर साफ करें।"],
        ["Ensure that transparent rubber caps provided over the push buttons of driver desk.", "सुनिश्चित करें कि ड्राइवर डेस्क के पुश बटनों पर पारदर्शी रबर कैप लगे हों।"],
        ["Clean the battery, OHE and TE/BE meters in both cabs and check for zero error", "दोनों कैब में बैटरी, OHE तथा TE/BE मीटर साफ करें और शून्य त्रुटि की जाँच करें।"],
        ["Check tightness/operation/cable rubbing of connector, earthing of angle transmitter, all rubber gasket and all equipment located on BL and its box frame inside the panel. Clean contacts, check cap and its fitment tightness.", "कनेक्टर की कसावट व कार्यशीलता, केबल रगड़, एंगल ट्रांसमीटर की अर्थिंग, सभी रबर गैस्केट तथा पैनल के अंदर BL और उसके बॉक्स फ्रेम पर लगे सभी उपकरणों की जाँच करें। कॉन्टैक्ट साफ करें तथा कैप और उसकी फिटमेंट की कसावट जाँचें।"],
        ["Check tightness of sub D located on BL.", "BL पर लगे Sub-D कनेक्टर की कसावट जाँचें।"],
        ["Check ZPT switch located on pneumatic panel.", "न्यूमैटिक पैनल पर लगे ZPT स्विच की जाँच करें।"],
        ["Check all earthing points located on equipment.", "उपकरणों पर स्थित सभी अर्थिंग पॉइंट की जाँच करें।"],
        ["Check lighting units for physical damage, tightness of fixing connections, particularly look for signs of overheating or burning. Replace bulbs/tubes, which have failed.", "लाइटिंग यूनिट में भौतिक क्षति तथा फिक्सिंग कनेक्शन की कसावट जाँचें। विशेष रूप से अधिक गर्म होने या जलने के संकेत देखें। खराब बल्ब/ट्यूब बदलें।"],
        ["Clean all internal light unit diffusers, bulbs or tubes and reflectors.", "सभी आंतरिक लाइट यूनिट के डिफ्यूज़र, बल्ब/ट्यूब तथा रिफ्लेक्टर साफ करें।"],
        ["Clean the glasses of the headlight lamp and marker light.", "हेडलाइट लैंप और मार्कर लाइट के काँच साफ करें।"],
        ["Ensure that there is no entry of water through head light lamps.", "सुनिश्चित करें कि हेडलाइट लैंप के माध्यम से पानी प्रवेश न करे।"],
        ["Check for crack or breakage of the aluminum casing of headlight beams.", "हेडलाइट बीम की एल्युमिनियम केसिंग में दरार या टूट-फूट की जाँच करें।"],
        ["Check the proper operation of flasher light, marker light (red & white), headlight, cab lights, disc light, m/c. room light.", "फ्लैशर लाइट, मार्कर लाइट (लाल व सफेद), हेडलाइट, कैब लाइट, डिस्क लाइट तथा मशीन रूम लाइट की सही कार्यशीलता जाँचें।"],
        ["Check headlight holder and clean glass & reflector. check tightness of headlight convertor, Ensure sealing .", "हेडलाइट होल्डर की जाँच करें तथा काँच और रिफ्लेक्टर साफ करें। हेडलाइट कन्वर्टर की कसावट जाँचें और सीलिंग सुनिश्चित करें।"],
        ["Clean marker light glass and check tightness of connection. Check looseness, flashing in flasher unit.", "मार्कर लाइट का काँच साफ करें और कनेक्शन की कसावट जाँचें। फ्लैशर यूनिट में ढीलापन तथा फ्लैशिंग की जाँच करें।"],
        ["Check the mounting block of 8.1 and 8.2 contactors by opening side windows and check the main contactor, pre charging contactor foundation bolt tips for looseness and overheating by removing arc-chutes from front side.", "साइड विंडो खोलकर 8.1 और 8.2 कॉन्टैक्टर के माउंटिंग ब्लॉक की जाँच करें। सामने से आर्क-च्यूट हटाकर मुख्य कॉन्टैक्टर तथा प्री-चार्जिंग कॉन्टैक्टर के फाउंडेशन बोल्ट और टिप्स में ढीलापन व अधिक गर्म होने की जाँच करें।"],
        ["Check the condition of capacitors for leakage and check earth fault relay, resistance and discharging resistance for overheating. Check the tightness of all fastener lug, LEM sensor and CTs.", "कैपेसिटर में रिसाव की स्थिति जाँचें तथा अर्थ फॉल्ट रिले, रेजिस्टेंस और डिस्चार्जिंग रेजिस्टेंस में अधिक गर्म होने की जाँच करें। सभी फास्टनर लग, LEM सेंसर और CT की कसावट जाँचें।"],
        ["Ensure that the various foundations bolts, body support bolts and supports plates of FB cubicle are intact and tight. Check tightness of cubical doors safety locks.", "सुनिश्चित करें कि FB क्यूबिकल के सभी फाउंडेशन बोल्ट, बॉडी सपोर्ट बोल्ट और सपोर्ट प्लेट सही तथा कसे हुए हों। क्यूबिकल दरवाजों के सेफ्टी लॉक की कसावट जाँचें।"],
        ["Ensure tightness of various electrical connections, CBS in SB, HB cubicles.", "SB तथा HB क्यूबिकल में विभिन्न विद्युत कनेक्शन और CBS की कसावट सुनिश्चित करें।"],
        ["Check back side of HB cubicle all SB connections for tightness/overheating/cable rubbing.", "HB क्यूबिकल के पीछे सभी SB कनेक्शन में कसावट, अधिक गर्म होने और केबल रगड़ की जाँच करें।"],
        ["Check all equipments’ fitment, tightness, intactness of base foundation bolts & body support.", "सभी उपकरणों की फिटमेंट व कसावट तथा बेस फाउंडेशन बोल्ट और बॉडी सपोर्ट की सही स्थिति जाँचें।"],
        ["Ensure earthing point/shunts of all panels/cubicles.", "सभी पैनल/क्यूबिकल के अर्थिंग पॉइंट और शंट सुनिश्चित करें।"],
        ["Check all MCB cable connections & Siemen connector tightness and no overheating.", "सभी MCB केबल कनेक्शन और Siemens कनेक्टर की कसावट जाँचें तथा सुनिश्चित करें कि अधिक गर्म होने के संकेत न हों।"],
        ["Check tightness of 80 A & 150 A contactors connection and condition of tips.", "80 A और 150 A कॉन्टैक्टर कनेक्शन की कसावट तथा टिप्स की स्थिति जाँचें।"],
        ["Check 1000 V/415 V/110 V transformer connections for overheating and tightness of foundation bolts and checking of fuses for healthy connection.", "1000 V/415 V/110 V ट्रांसफॉर्मर कनेक्शन में अधिक गर्म होने, फाउंडेशन बोल्ट की कसावट तथा फ्यूज के सही कनेक्शन की जाँच करें।"],
        ["Check tightness and condition of capacitor, LEM sensor below HB panel, earth fault relay & resistance connection, RLC plate, temperature sensor and all diode boxes.", "कैपेसिटर, HB पैनल के नीचे LEM सेंसर, अर्थ फॉल्ट रिले व रेजिस्टेंस कनेक्शन, RLC प्लेट, तापमान सेंसर तथा सभी डायोड बॉक्स की कसावट और स्थिति जाँचें।"],
        ["Checking of OCB cable in HB 1& 2 for overheating cable no.1121, 1122, 1123 (A & B).", "HB-1 और HB-2 में OCB केबल संख्या 1121, 1122 और 1123 (A व B) में अधिक गर्म होने की जाँच करें।"],
        ["Check fasten lug connected on various equipment. Fitment, tightness.", "विभिन्न उपकरणों से जुड़े फास्टनिंग लग की फिटमेंट और कसावट जाँचें।"],
        ["Check intactness of base foundation bolts & body support. Check tightness of cubical doors safety locks.", "बेस फाउंडेशन बोल्ट और बॉडी सपोर्ट की सही स्थिति जाँचें। क्यूबिकल दरवाजों के सेफ्टी लॉक की कसावट जाँचें।"],
        ["Check all EMC connector lug position/layout. It should not be touch with plunger.", "सभी EMC कनेक्टर लग की स्थिति और लेआउट जाँचें। वे प्लंजर को स्पर्श नहीं करने चाहिए।"],
        ["Check tightness of DC-DC converter 24V/48V and Siemen connector for overheating.", "24V/48V DC-DC कन्वर्टर तथा Siemens कनेक्टर की कसावट और अधिक गर्म होने की जाँच करें।"],
        ["Ensure the healthiness; Visually check all pre/proper functioning of rotating switch 152, 154 and 237.1 on its various locations.", "रोटरी स्विच 152, 154 और 237.1 की विभिन्न स्थितियों में सही कार्यशीलता का दृश्य निरीक्षण करके उनकी स्वस्थ स्थिति सुनिश्चित करें।"],
        ["Check visually for any abnormality in SB, HB & FB cubicle", "SB, HB और FB क्यूबिकल में किसी भी असामान्यता का दृश्य निरीक्षण करें।"],
        ["Ensure proper functioning of thermostat of central electronics. (IC Sch.)", "सेंट्रल इलेक्ट्रॉनिक्स के थर्मोस्टेट की सही कार्यशीलता सुनिश्चित करें। (IC शिड्यूल)"],
        ["Clean the dust of enclosure using vacuum cleaner.", "वैक्यूम क्लीनर से एनक्लोजर की धूल साफ करें।"],
        ["Check the metallic strip provided for spring action in the contact is intact. Replace the contact if required.", "जाँचें कि कॉन्टैक्ट में स्प्रिंग क्रिया के लिए दी गई धातु पट्टी सही है। आवश्यकता होने पर कॉन्टैक्ट बदलें।"],
        ["Check the connections for 25, 50 & 70 Sq. mm cables for their tightness. (IC Sch.)", "25, 50 और 70 वर्ग मिमी केबल कनेक्शन की कसावट जाँचें। (IC शिड्यूल)"],
        ["Check visually and manually all cards tightness, locking, all sub-D connection tightness, all optic fibre cable tightness for proper layout. Check tightness of cubical doors safety locks.", "सभी कार्ड की कसावट व लॉकिंग, सभी Sub-D कनेक्शन की कसावट तथा उचित लेआउट के लिए सभी ऑप्टिक फाइबर केबल की कसावट का दृश्य और हाथ से निरीक्षण करें। क्यूबिकल दरवाजों के सेफ्टी लॉक की कसावट जाँचें।"],
        ["Check the operation of all fans for free movements.", "सभी पंखों के निर्बाध घूमने और कार्यशीलता की जाँच करें।"],
        ["Check the tightness of connections of control cards. (IC Sch.)", "कंट्रोल कार्ड के कनेक्शन की कसावट जाँचें। (IC शिड्यूल)"],
        ["Check and clean FDU pipe line by vacuum cleaner. (IC Sch.)", "FDU पाइप लाइन की जाँच करें और वैक्यूम क्लीनर से साफ करें। (IC शिड्यूल)"],
        ["Ensure the intactness / firmness of cable connection of Sicemcouplers of differential amplifiers provided below SR oil pump. (IC Sch.)", "SR ऑयल पंप के नीचे लगे डिफरेंशियल एम्प्लीफायर के Sicem coupler के केबल कनेक्शन की सही स्थिति और मजबूती सुनिश्चित करें। (IC शिड्यूल)"],
        ["Calibrate the FDU and set voltage in between: Trolex make: 0 to + 100 mV Siemens/Cerberus make: 0 to + 50 mV", "FDU को कैलिब्रेट करें और वोल्टेज इस सीमा में सेट करें: Trolex मेक: 0 से +100 mV; Siemens/Cerberus मेक: 0 से +50 mV।"]
    ]);

    function finish(subject, instruction) {
        const value = clean(subject).replace(/[.:;]+$/, "");
        return value ? `${value} ${instruction}` : "";
    }

    function translateActivity(value) {
        const text = clean(value);
        if (!text || /[\u0900-\u097f]/.test(text)) return "";

        const verified = verifiedTranslations.get(text);
        if (verified) return verified;

        const rules = [
            [/^check\s+and\s+ensure\s+(?:the\s+)?proper\s+functioning\s+of\s+(.+)$/i,
                match => finish(match[1], "की सही कार्यशीलता की जाँच करके सुनिश्चित करें।")],
            [/^check(?:ing)?\s+(?:the\s+)?working\s+of\s+(.+)$/i,
                match => finish(match[1], "की कार्यशीलता जाँचें।")],
            [/^working\s+(?:in|of)\s+(.+)$/i,
                match => finish(match[1], "की कार्यशीलता जाँचें।")],
            [/^(?:condition|status)\s+of\s+(.+)$/i,
                match => finish(match[1], "की स्थिति जाँचें।")],
            [/^check(?:ing)?\s+(.+?)\s+for\s+(.+)$/i,
                match => `${clean(match[1])} में ${clean(match[2])} की जाँच करें।`],
            [/^check(?:ing)?\s+(.+)$/i,
                match => finish(match[1], "की जाँच करें।")],
            [/^(?:visually\s+)?(?:inspect|examine)\s+(.+)$/i,
                match => finish(match[1], "का निरीक्षण करें।")],
            [/^ensure\s+(.+)$/i,
                match => finish(match[1], "सुनिश्चित करें।")],
            [/^verify\s+(.+)$/i,
                match => finish(match[1], "का सत्यापन करें।")],
            [/^test\s+(.+)$/i,
                match => finish(match[1], "का परीक्षण करें।")],
            [/^clean\s+(.+)$/i,
                match => finish(match[1], "को साफ करें।")],
            [/^measure\s+(.+)$/i,
                match => finish(match[1], "मापें।")],
            [/^record\s+(.+)$/i,
                match => finish(match[1], "दर्ज करें।")],
            [/^(?:replace|renew)\s+(.+)$/i,
                match => finish(match[1], "बदलें।")],
            [/^(?:grease|lubricate)\s+(.+)$/i,
                match => finish(match[1], "में lubrication करें।")],
            [/^tighten\s+(.+)$/i,
                match => finish(match[1], "को कसें।")],
            [/^remove\s+(.+)$/i,
                match => finish(match[1], "हटाएँ।")],
            [/^(?:refit|fit)\s+(.+)$/i,
                match => finish(match[1], "को सही प्रकार से लगाएँ।")],
            [/^provide\s+(.+)$/i,
                match => finish(match[1], "उपलब्ध कराएँ।")],
            [/^apply\s+(.+)$/i,
                match => finish(match[1], "लगाएँ।")],
            [/^drain\s+(.+)$/i,
                match => finish(match[1], "निकालें।")],
            [/^(?:refill|top\s*up)\s+(.+)$/i,
                match => finish(match[1], "को निर्धारित स्तर तक भरें।")],
            [/^match\s+(.+)$/i,
                match => finish(match[1], "का मिलान करें।")],
            [/^operation\s+of\s+(.+)$/i,
                match => finish(match[1], "का संचालन जाँचें।")]
        ];

        for (const [pattern, formatter] of rules) {
            const match = text.match(pattern);
            if (match) return formatter(match);
        }
        return "";
    }

    function enhance(container) {
        if (!container) return 0;
        let count = 0;
        container.querySelectorAll("td, th").forEach(cell => {
            if (cell.dataset.hindiActivity === "true") return;
            if (cell.querySelector("input, select, textarea")) return;
            const english = clean(cell.textContent);
            if (!activityPattern.test(english)) return;
            const hindi = translateActivity(english);
            if (!hindi) return;

            const line = document.createElement("div");
            line.className = "schedule-activity-hindi";
            line.lang = "hi";
            line.textContent = hindi;
            cell.appendChild(line);
            cell.dataset.hindiActivity = "true";
            count += 1;
        });
        return count;
    }

    const api = { translateActivity, enhance };
    globalObject.BilingualScheduleActivities = api;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
