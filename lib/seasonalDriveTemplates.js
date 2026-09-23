function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function checklistTable(items) {
    return `<table class="seasonal-drive-form"><thead><tr><th>SN<br><small>क्र.</small></th><th>Inspection Point<br><small>जांच का विवरण</small></th><th>Inspection Result<br><small>जांच परिणाम</small></th><th>Name of TCN / Remarks<br><small>तकनीशियन का नाम / टिप्पणी</small></th></tr></thead><tbody>${items.map((item, index) => `<tr><td>${index + 1}</td><td>${item}</td><td data-admin-field-type="inspection"></td><td></td></tr>`).join("")}</tbody></table>`;
}

function seasonalHeader(title, subtitle) {
    return `<h2>${escapeHtml(title)}</h2><p><strong>${escapeHtml(subtitle)}</strong></p>`;
}

function summerDriveTemplate() {
    const checks = [
        "Ensure operation of the driving-cab cooling/cabin fan.<br><small>ड्राइविंग कैब के कूलिंग/केबिन फैन का कार्यरत होना सुनिश्चित करें।</small>",
        "If Cab AC is fitted, check operation and perform pull-down test; record observed values.<br><small>यदि कैब एसी लगा हो तो संचालन और पुल-डाउन टेस्ट करके प्राप्त मान दर्ज करें।</small>",
        "Check oil leakage at SR-1/SR-2 pump joints, pressure-sensor joints and converter gauge-glass joints.<br><small>SR-1/SR-2 पंप, प्रेशर सेंसर तथा कन्वर्टर गेज-ग्लास के जोड़ों पर ऑयल लीकेज जांचें।</small>",
        "Check traction-motor covers, bellows fitment bolts, bellow plates and their bolts.<br><small>ट्रैक्शन मोटर कवर, बेलो फिटमेंट बोल्ट, बेलो प्लेट और बोल्ट की स्थिति जांचें।</small>",
        "Ensure SR gauge-glass oil level is between minimum and maximum marks.<br><small>SR गेज-ग्लास का ऑयल स्तर न्यूनतम और अधिकतम निशान के बीच सुनिश्चित करें।</small>",
        "Check the fire-detection unit and potentiometer output; rectify through relay room if required.<br><small>फायर डिटेक्शन यूनिट और पोटेंशियोमीटर आउटपुट जांचें; आवश्यकता पर सुधार कराएं।</small>",
        "Ensure cooling fans of Central Electronics 1/2, SR 1/2 and BUR electronics are working.<br><small>सेंट्रल इलेक्ट्रॉनिक्स 1/2, SR 1/2 और BUR इलेक्ट्रॉनिक्स के कूलिंग फैन कार्यरत सुनिश्चित करें।</small>",
        "Ensure earthing-wire connections of all traction motors are properly connected.<br><small>सभी ट्रैक्शन मोटरों के अर्थिंग वायर कनेक्शन सही लगे होना सुनिश्चित करें।</small>",
        "Check standard air delivery from all blowers.<br><small>सभी ब्लोअर की मानक एयर डिलीवरी जांचें।</small>",
        "Clean accumulated dust from the locomotive interior and machine room.<br><small>लोको के इंटीरियर और मशीन रूम में जमा धूल-मिट्टी साफ करें।</small>",
        "Check 35 and 70 sq-mm cables in HB-1/HB-2 panels for overheating.<br><small>HB-1/HB-2 पैनल के 35 और 70 वर्ग मिमी केबल में ओवरहीटिंग जांचें।</small>",
        "Check oil leakage in DC-link capacitors of SR-1/2 and BUR-1/2/3.<br><small>SR-1/2 और BUR-1/2/3 के DC लिंक कैपेसिटर में ऑयल लीकेज जांचें।</small>",
        "Check BA cable male-female contacts for flashover or overheating marks.<br><small>BA केबल मेल-फीमेल कॉन्टैक्ट पर फ्लैशओवर या ओवरहीटिंग निशान जांचें।</small>",
        "Check continuity of earthing brush and cable.<br><small>अर्थिंग ब्रश और केबल की कंटिन्यूटी जांचें।</small>",
        "Ensure temperature strips are fitted on driving-end bearing side and record displayed temperature.<br><small>ड्राइविंग-एंड बेयरिंग साइड पर टेम्परेचर स्ट्रिप सुनिश्चित कर प्रदर्शित तापमान दर्ज करें।</small>"
    ];
    const measurements = [
        ["SCTMB & OCB 1/2", "Min 13 m/s"], ["MRB 1/2", "Min 3 m/s"],
        ["SCMRB 1/2", "Min 12 m/s"], ["OCB 1", "Min 8 m/s"],
        ["OCB 2", "Min 8 m/s"], ["TMB 1/2", "Min 12 m/s"]
    ];
    return seasonalHeader("Summer Drive Schedule Form / ग्रीष्म ऋतु ड्राइव", "Pre-summer precaution checklist / ग्रीष्म ऋतु पूर्व सावधानी जांच सूची") + checklistTable(checks) + `<table><thead><tr><th>Equipment</th><th>Standard Value</th><th>Actual Value</th><th>Name of TCN / Remarks<br><small>तकनीशियन का नाम / टिप्पणी</small></th></tr></thead><tbody>${measurements.map(([name, standard]) => `<tr><td>${name}</td><td>${standard}</td><td data-admin-field-type="value"></td><td></td></tr>`).join("")}</tbody></table><table><thead><tr><th>TM</th>${[1,2,3,4,5,6].map(number=>`<th>TM ${number}</th>`).join("")}</tr></thead><tbody><tr><td>Actual Value</td>${[1,2,3,4,5,6].map(()=>'<td data-admin-field-type="value"></td>').join("")}</tr></tbody></table>`;
}

function monsoonDriveTemplate() {
    return seasonalHeader("Monsoon Drive Schedule Form / मानसून ड्राइव", "Pre-monsoon precaution checklist / वर्षा ऋतु पूर्व सावधानी जांच सूची") + checklistTable([
        "Test water-tightness of the locomotive body including roof with a high-pressure water jet and seal leakage points.<br><small>उच्च दबाव पानी की जेट से छत सहित लोको बॉडी की जलरोधकता जांचकर रिसाव बिंदु सील करें।</small>",
        "Inspect leakage-prone joints: Cab AC body joints, roof-equipment mounting bases, marker/flasher lights, headlight gasket and MU/coupler socket cover.<br><small>कैब AC जोड़, छत उपकरण माउंटिंग, मार्कर/फ्लैशर लाइट, हेडलाइट गैसकेट और कपलर सॉकेट कवर जांचें।</small>",
        "Ensure proper operation of sanding equipment.<br><small>सैंडिंग उपकरण का उचित कार्य सुनिश्चित करें।</small>",
        "Clean Cab AC drain pipe and ensure no water accumulates on the unit.<br><small>कैब AC ड्रेन पाइप साफ करें और यूनिट पर पानी जमा न होना सुनिश्चित करें।</small>",
        "During water-tightness test, check leakage at machine-room and TM-blower filter joints.<br><small>जलरोधकता परीक्षण में मशीन रूम और TM ब्लोअर फिल्टर जोड़ों पर रिसाव जांचें।</small>",
        "Replace converter silica gel.<br><small>कन्वर्टर का सिलिका जेल बदलें।</small>",
        "Measure harmonic-filter resistance with a megger and clean if below standard.<br><small>हार्मोनिक फिल्टर रेजिस्टेंस मेगर से जांचें और कम होने पर सफाई करें।</small>",
        "Ensure proper sealing of SPM pulse generator (PG).<br><small>SPM पल्स जनरेटर (PG) की उचित सीलिंग सुनिश्चित करें।</small>"
    ]);
}

function winterDriveTemplate() {
    return seasonalHeader("Winter Drive Schedule Form / शीत ऋतु ड्राइव", "Winter precaution checklist / शीत ऋतु सावधानी जांच सूची") + checklistTable([
        "Ensure cleaning of CT and PT fitted on the roof.<br><small>रूफ पर लगे CT एवं PT की सफाई सुनिश्चित करें।</small>",
        "Ensure heaters/blowers of both cabs are operational as per RDSO/2011/EL/MS/0405 (Rev. 0).<br><small>दोनों कैब के हीटर/ब्लोअर का कार्यरत होना सुनिश्चित करें।</small>",
        "Check proper coolant/oil level in both traction converters.<br><small>दोनों ट्रैक्शन कन्वर्टर में कूलेंट/ऑयल का उचित स्तर जांचें।</small>",
        "Ensure traction-converter silica gel is in good condition.<br><small>ट्रैक्शन कन्वर्टर का सिलिका जेल अच्छी स्थिति में सुनिश्चित करें।</small>",
        "Ensure TM inspection cover is correctly fitted with gasket and has no air leakage.<br><small>TM इंस्पेक्शन कवर गैसकेट सहित सही फिट हो और एयर लीकेज न हो।</small>",
        "Clean battery terminals and apply petroleum jelly.<br><small>बैटरी टर्मिनल साफ कर पेट्रोलियम जेली लगाना सुनिश्चित करें।</small>",
        "Check headlight cleaning, focus and intensity; ensure flasher and marker lights are clean and working.<br><small>हेडलाइट की सफाई, फोकस और तीव्रता तथा फ्लैशर/मार्कर लाइट का कार्य जांचें।</small>",
        "Check battery-box cover sealing against water leakage.<br><small>बैटरी बॉक्स कवर की पानी रिसाव से बचाव वाली सीलिंग जांचें।</small>"
    ]);
}

module.exports = { summerDriveTemplate, monsoonDriveTemplate, winterDriveTemplate };
