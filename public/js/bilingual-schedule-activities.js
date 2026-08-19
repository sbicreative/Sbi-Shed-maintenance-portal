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
        ["IC Sch.: a) Clean various equipment fitted inside the SB, HB & FB cubicle.", "IC शिड्यूल: (a) SB, HB और FB क्यूबिकल के अंदर लगे विभिन्न उपकरणों को साफ करें।"],
        ["b) Visual examination of various EPCs & EMCs fitted inside FB cubicle and ensure that there is no crackness of cover cylinder, leakage and they are functioning properly.", "(b) FB क्यूबिकल के अंदर लगे विभिन्न EPC और EMC का दृश्य निरीक्षण करें। सुनिश्चित करें कि कवर सिलिंडर में कोई दरार या रिसाव न हो तथा वे सही प्रकार से कार्य कर रहे हों।"],
        ["c) Check the tightness of various PCB cards in central electronics.", "(c) सेंट्रल इलेक्ट्रॉनिक्स में लगे विभिन्न PCB कार्ड की कसावट जाँचें।"],
        ["d) Check the RC input filter circuit for any abnormality and measure the resistance value.", "(d) RC इनपुट फिल्टर सर्किट में किसी भी असामान्यता की जाँच करें तथा प्रतिरोध का मान मापें।"],
        ["e) Take out the arc-chutes of pre-charging contactors for looseness of strips and ensure tightness of its armature locking nut by hand.", "(e) प्री-चार्जिंग कॉन्टैक्टर के आर्क-च्यूट निकालकर स्ट्रिप में ढीलापन जाँचें और आर्मेचर लॉकिंग नट की हाथ से कसावट सुनिश्चित करें।"],
        ["f) Check the FB cable junction for tightness, cable rubbing and overheating.", "(f) FB केबल जंक्शन में कसावट, केबल रगड़ और अधिक गर्म होने की जाँच करें।"],
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
        ["Visually check the connections on backside of SB 1 & 2 panel for overheating of WAGO connector etc.", "SB-1 और SB-2 पैनल के पीछे के कनेक्शन तथा WAGO कनेक्टर आदि में अधिक गर्म होने का दृश्य निरीक्षण करें।"],
        ["Check tightness of DC-DC converter 24V/48V and Siemen connector for overheating.", "24V/48V DC-DC कन्वर्टर तथा Siemens कनेक्टर की कसावट और अधिक गर्म होने की जाँच करें।"],
        ["Visually check all pressure switches, tightness of MCB, MCR relay, no voltage relay connections.", "सभी प्रेशर स्विच तथा MCB, MCR रिले और नो-वोल्टेज रिले कनेक्शन की कसावट का दृश्य निरीक्षण करें।"],
        ["Key interlocking: Check all keys are present & the complete system is operational.", "की-इंटरलॉकिंग: जाँचें कि सभी चाबियाँ उपलब्ध हैं और पूरी प्रणाली कार्यशील है।"],
        ["Ensure the healthiness; Visually check all pre/proper functioning of rotating switch 152, 154 and 237.1 on its various locations.", "रोटरी स्विच 152, 154 और 237.1 की विभिन्न स्थितियों में सही कार्यशीलता का दृश्य निरीक्षण करके उनकी स्वस्थ स्थिति सुनिश्चित करें।"],
        ["Check visually for any abnormality in SB, HB & FB cubicle", "SB, HB और FB क्यूबिकल में किसी भी असामान्यता का दृश्य निरीक्षण करें।"],
        ["Ensure proper functioning of thermostat of central electronics. (IC Sch.)", "सेंट्रल इलेक्ट्रॉनिक्स के थर्मोस्टेट की सही कार्यशीलता सुनिश्चित करें। (IC शिड्यूल)"],
        ["Clean the dust of enclosure using vacuum cleaner.", "वैक्यूम क्लीनर से एनक्लोजर की धूल साफ करें।"],
        ["Check the metallic strip provided for spring action in the contact is intact. Replace the contact if required.", "जाँचें कि कॉन्टैक्ट में स्प्रिंग क्रिया के लिए दी गई धातु पट्टी सही है। आवश्यकता होने पर कॉन्टैक्ट बदलें।"],
        ["Check the connections for 25, 50 & 70 Sq. mm cables for their tightness. (IC Sch.)", "25, 50 और 70 वर्ग मिमी केबल कनेक्शन की कसावट जाँचें। (IC शिड्यूल)"],
        ["Tightness of knife contact connection (female), 3-phase choke connection, Power contactor connection. (IC Sch.)", "नाइफ कॉन्टैक्ट कनेक्शन (फीमेल), 3-फेज चोक कनेक्शन तथा पावर कॉन्टैक्टर कनेक्शन की कसावट जाँचें। (IC शिड्यूल)"],
        ["Check visually and manually all cards tightness, locking, all sub-D connection tightness, all optic fibre cable tightness for proper layout. Check tightness of cubical doors safety locks.", "सभी कार्ड की कसावट व लॉकिंग, सभी Sub-D कनेक्शन की कसावट तथा उचित लेआउट के लिए सभी ऑप्टिक फाइबर केबल की कसावट का दृश्य और हाथ से निरीक्षण करें। क्यूबिकल दरवाजों के सेफ्टी लॉक की कसावट जाँचें।"],
        ["Check the operation of all fans for free movements.", "सभी पंखों के निर्बाध घूमने और कार्यशीलता की जाँच करें।"],
        ["Check the tightness of connections of control cards. (IC Sch.)", "कंट्रोल कार्ड के कनेक्शन की कसावट जाँचें। (IC शिड्यूल)"],
        ["Check and clean FDU pipe line by vacuum cleaner. (IC Sch.)", "FDU पाइप लाइन की जाँच करें और वैक्यूम क्लीनर से साफ करें। (IC शिड्यूल)"],
        ["Ensure the intactness / firmness of cable connection of Sicemcouplers of differential amplifiers provided below SR oil pump. (IC Sch.)", "SR ऑयल पंप के नीचे लगे डिफरेंशियल एम्प्लीफायर के Sicem coupler के केबल कनेक्शन की सही स्थिति और मजबूती सुनिश्चित करें। (IC शिड्यूल)"],
        ["Calibrate the FDU and set voltage in between: Trolex make: 0 to + 100 mV Siemens/Cerberus make: 0 to + 50 mV", "FDU को कैलिब्रेट करें और वोल्टेज इस सीमा में सेट करें: Trolex मेक: 0 से +100 mV; Siemens/Cerberus मेक: 0 से +50 mV।"]
        ,["During schedule check all Auxiliary Blower and Motors: -", "शिड्यूल के दौरान सभी सहायक ब्लोअर और मोटरों की जाँच करें।"]
        ,["3) Greasing of all motors with recommended grease or RR-3 Servo Gem Grease ,6 to 7 Stroke ,15 gm.", "3) सभी मोटरों में अनुशंसित ग्रीस अथवा RR-3 Servo Gem Grease के 6 से 7 स्ट्रोक (15 ग्राम) भरें।"]
        ,["Both sides UIC coupler cover tension to be checked. If found not proper then replace the same.", "दोनों ओर UIC कपलर कवर का तनाव जाँचें। सही न पाए जाने पर उसे बदलें।"]
        ,["UIC coupler must be in closed condition to preventing ingress of dust and water.", "धूल और पानी का प्रवेश रोकने के लिए UIC कपलर को बंद स्थिति में रखना सुनिश्चित करें।"]
        ,["In UIC coupler, condition of all red colour gaskets needs to be checked.", "UIC कपलर में सभी लाल रंग के गैस्केट की स्थिति जाँचें।"]
        ,["Auxiliary rectifier & Inverter (CG Module &WRE module): check the security of bolted terminals and mechanical mounting of larger components.", "सहायक रेक्टिफायर और इन्वर्टर (CG मॉड्यूल व WRE मॉड्यूल): बोल्टेड टर्मिनल की सुरक्षा तथा बड़े घटकों की मैकेनिकल माउंटिंग जाँचें।"]
        ,["(IC Sch) Check the contacts of all modules and ensure proper tightness", "(IC शिड्यूल) सभी मॉड्यूल के कॉन्टैक्ट जाँचें और उचित कसावट सुनिश्चित करें।"]
        ,["If the value is more than 0.005 mH, measure the inductance of individual TM and if difference between two phase of motor is < 0.015mH, allow the motor for next schedule. If > 0.015mH, remove the motor", "यदि मान 0.005 mH से अधिक हो तो प्रत्येक TM की इंडक्टेंस मापें। मोटर के दो फेज के बीच अंतर 0.015 mH से कम हो तो अगले शिड्यूल तक मोटर को उपयोग में रखें; 0.015 mH से अधिक होने पर मोटर हटाएँ।"]
        ,["Open TM Junction box at body side and check the tightness of connections", "बॉडी साइड का TM जंक्शन बॉक्स खोलें और कनेक्शन की कसावट जाँचें।"]
        ,["If applicable following to be check:", "लागू होने पर निम्न बिंदुओं की जाँच करें:"]
        ,["Customer Feed Back/Bookings (Record feedback given by Loco pilot)", "ग्राहक प्रतिक्रिया/बुकिंग (लोको पायलट द्वारा दी गई प्रतिक्रिया दर्ज करें)।"]
        ,["Operation time Approx. 12 Sec.", "कार्य समय लगभग 12 सेकंड जाँचें।"]
        ,["Duplex check valve setting/Brake Pipe Pressure by Auto Brake (A9)", "डुप्लेक्स चेक वाल्व सेटिंग तथा ऑटो ब्रेक (A9) से ब्रेक पाइप दबाव जाँचें।"]
        ,["Working, Tower to change every minute (FTIL, SIL) & In every two minutes (KBIL )", "कार्यशीलता जाँचें: FTIL/SIL में टावर प्रत्येक मिनट और KBIL में प्रत्येक दो मिनट में बदलना चाहिए।"]
        ,["ACP on 4mm test plate", "4 मिमी टेस्ट प्लेट पर ACP की जाँच करें।"]
        ,["Loco pilot cabin condition", "लोको पायलट कैबिन की स्थिति जाँचें।"]
        ,["(A) Pneumatic System (When Loco is energised check, attend and record )", "(A) न्यूमैटिक प्रणाली (लोको ऊर्जित होने पर जाँचें, आवश्यक कार्रवाई करें और दर्ज करें)।"]
        ,["(RS drop) Panto line air leakage 0.70 kg/cm 2 in 5 minutes.", "(RS ड्रॉप) पेंटो लाइन में वायु रिसाव 5 मिनट में अधिकतम 0.70 kg/cm² होना जाँचें।"]
        ,["Position of isolating cock on pneumatic panel. (70,74,136 in open condition & 47 in close condition.)", "न्यूमैटिक पैनल पर आइसोलेटिंग कॉक की स्थिति जाँचें (70, 74 और 136 खुले तथा 47 बंद होने चाहिए)।"]
        ,["OIL LEAKAGE IN MACHINE ROOM / CLEANING OF MACHINE ROOM.", "मशीन रूम में तेल रिसाव की जाँच तथा मशीन रूम की सफाई करें।"]
        ,["UPPER DECK [Inspect, Attend and Record]", "ऊपरी डेक [निरीक्षण करें, आवश्यक कार्रवाई करें और दर्ज करें]।"]
        ,["Clamping and condition of its welding/fastener.", "क्लैम्पिंग तथा वेल्डिंग/फास्टनर की स्थिति जाँचें।"]
        ,["Condition and working of all pressure gauges.", "सभी प्रेशर गेज की स्थिति और कार्यशीलता जाँचें।"]
        ,["Leakage of air (MR)", "MR में वायु रिसाव की जाँच करें।"]
        ,["Co-Action working of A9 Auto brake.", "A9 ऑटो ब्रेक की सह-क्रिया और कार्यशीलता जाँचें।"]
        ,["UNDER TRUCK [Inspect, Attend and Record]", "अंडर ट्रक [निरीक्षण करें, आवश्यक कार्रवाई करें और दर्ज करें]।"]
        ,["Air leakage in bogie.", "बोगी में वायु रिसाव की जाँच करें।"]
        ,["A-Check and record Hoot Wear, Flange Wear & Tread Wear (Record Wheel Diameter in Schedule or After TT)", "A-हूट वियर, फ्लैन्ज वियर और ट्रेड वियर जाँचकर दर्ज करें (शिड्यूल अथवा TT के बाद पहिये का व्यास दर्ज करें)।"]
        ,["Hand Brake Operation", "हैंड ब्रेक की कार्यशीलता जाँचें।"]
        ,["CB Coupler Operation & Condition", "CB कपलर की कार्यशीलता और स्थिति जाँचें।"]
        ,["Transition Screw Coupling Operation & Condition", "ट्रांजिशन स्क्रू कपलिंग की कार्यशीलता और स्थिति जाँचें।"]
        ,["Detail of Work/ Inspection", "कार्य/निरीक्षण का विवरण।"]
        ,["Detail of Work/ Inspection (schedule)", "कार्य/निरीक्षण का विवरण (शिड्यूल)।"]
        ,["Details of Work / Inspection (Schedule)", "कार्य/निरीक्षण का विवरण (शिड्यूल)।"]
        ,["d) Metal builds up Height 1mm, or above and length 50mm or more requires re-profiling. For length less than 50mm., remove the build up with hand tools.", "d) धातु जमाव की ऊँचाई 1 मिमी या अधिक और लंबाई 50 मिमी या अधिक हो तो री-प्रोफाइलिंग करें। लंबाई 50 मिमी से कम हो तो हाथ के औजारों से जमाव हटाएँ।"]
        ,["Disconnect the electrical cable from the earth return unit. Remove the earth return unit from the axle. Examine the bearings and rear sealing position for signs of grease leakage or deterioration.", "अर्थ रिटर्न यूनिट से विद्युत केबल अलग करें और यूनिट को एक्सल से हटाएँ। बेयरिंग तथा पीछे की सीलिंग स्थिति में ग्रीस रिसाव या खराबी के संकेत जाँचें।"]
        ,["Externally clean the gear case & its gauge glass. Inspect for any signs of oil leakage and any external hits/ damage. Verify integrity of gauge glass protective cover and clean oil sight glass for visibility.", "गियर केस और उसके गेज ग्लास को बाहर से साफ करें। तेल रिसाव तथा बाहरी चोट/क्षति जाँचें। गेज ग्लास के सुरक्षा कवर की सही स्थिति सुनिश्चित करें और दृश्यता के लिए ऑयल साइट ग्लास साफ करें।"]
        ,["a) Axle box old grease to remove and New grease to fill, old grease sample to be sent Lab for metal content check", "a) एक्सल बॉक्स से पुरानी ग्रीस निकालकर नई ग्रीस भरें और धातु अंश की जाँच के लिए पुरानी ग्रीस का नमूना प्रयोगशाला भेजें।"]
        ,["If skidded, fill Wheel Sledding Complain Report Farm, FRMB/22 or if Biased wheel wear, fill up Check last for Based Wheel Wear Cause Invest, FILM/24)", "स्किडिंग होने पर Wheel Skidding Complaint Report Form FRMB/22 भरें। असमान पहिया घिसाव होने पर उसके कारण की जाँच सूची FILM/24 भरें।"]
        ,["Proper Fitment of Brake Block and as Key", "ब्रेक ब्लॉक और उसकी की की उचित फिटमेंट जाँचें।"]
        ,["Fitment of Rail Guard", "रेल गार्ड की फिटमेंट जाँचें।"]
        ,["Sch IC: i) CP all discharge valves to remove.", "IC शिड्यूल: i) CP के सभी डिस्चार्ज वाल्व हटाएँ।"]
        ,["ii) CP all discharge valves refit by overhauled", "ii) CP के सभी डिस्चार्ज वाल्व ओवरहॉल किए हुए वाल्वों से पुनः लगाएँ।"]
        ,["v) Baby compressor/CPA safety valve (8.5 kg/cm 2 ) to be replace by overhauled", "v) बेबी कंप्रेसर/CPA सेफ्टी वाल्व (8.5 kg/cm²) को ओवरहॉल किए हुए वाल्व से बदलें।"]
        ,["NRV and unloader valves fail due to ingress of Carbon which extracted from CP. So, one cycle dismantling, checking and cleaning of NRV and unloader to be ensured in all type of 3-phase locomotives.", "CP से निकले कार्बन के प्रवेश के कारण NRV और अनलोडर वाल्व खराब हो सकते हैं। इसलिए सभी प्रकार के 3-फेज लोको में प्रत्येक चक्र में NRV और अनलोडर को खोलकर जाँच और सफाई सुनिश्चित करें।"]
        ,["BRAKE ISOLATING COCKS: Check for correct operations of BP & FP angle cocks. Check the condition of BP/FP pipe, cock & isolating handle for any hit mark or crack. Check correct condition of Bogie Isolating cock.", "ब्रेक आइसोलेटिंग कॉक: BP और FP एंगल कॉक की सही कार्यशीलता जाँचें। BP/FP पाइप, कॉक और आइसोलेटिंग हैंडल में चोट या दरार जाँचें तथा बोगी आइसोलेटिंग कॉक की सही स्थिति सुनिश्चित करें।"]
        ,["BRAKE HOSES: Examine the brake hoses at the ends of the locomotive to make sure that they are not chafed or damaged. Check coupling cocks for correct operation.", "ब्रेक होज: लोको के सिरों पर ब्रेक होज में रगड़ या क्षति जाँचें। कपलिंग कॉक की सही कार्यशीलता जाँचें।"]
        ,["IN LINE FILTER (IC Sch): Remove the filter element and clean thoroughly.", "इन-लाइन फिल्टर (IC शिड्यूल): फिल्टर एलिमेंट निकालकर अच्छी तरह साफ करें।"]
        ,["MR Safety valve, ADC, Panto throttle valve (Only for conventional Pantograph) replace by Overhaul in IC Sch.", "IC शिड्यूल में MR सेफ्टी वाल्व, ADC और पेंटो थ्रॉटल वाल्व (केवल पारंपरिक पेंटोग्राफ के लिए) को ओवरहॉल किए हुए यूनिट से बदलें।"]
        ,["70 N / 7Kg Load Test", "70 N / 7 किग्रा लोड परीक्षण करें।"]
        ,["CARBODY FILTER: Check condition and clean car body filter and refit.", "कारबॉडी फिल्टर: स्थिति जाँचें, फिल्टर साफ करें और पुनः लगाएँ।"]
        ,["Thoroughly clean all roof and side body filters with water jet.", "रूफ और साइड बॉडी के सभी फिल्टर पानी की धार से अच्छी तरह साफ करें।"]
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

        const activityText = text
            .replace(/^\s*(?:IC\s*Sch\.?|Sch\s*IC)\s*:\s*/i, "")
            .replace(/^\s*(?:[A-Z]-)?\d+\s*[.)]\s*/i, "")
            .replace(/^\s*\(?[a-zivx]+\)?\s*[.)]\s*/i, "")
            .trim();

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
                match => finish(match[1], "का संचालन जाँचें।")],
            [/^visually\s+check\s+(.+)$/i,
                match => finish(match[1], "का दृश्य निरीक्षण करें।")],
            [/^visual\s+(?:examination|checking)\s+(?:of\s+)?(.+)$/i,
                match => finish(match[1], "का दृश्य निरीक्षण करें।")],
            [/^perform\s+(.+)$/i,
                match => finish(match[1], "की निर्धारित प्रक्रिया पूरी करें।")],
            [/^carry\s+out\s+(.+)$/i,
                match => finish(match[1], "की निर्धारित प्रक्रिया पूरी करें।")],
            [/^feel\s+(.+)$/i,
                match => finish(match[1], "को महसूस करके जाँचें।")],
            [/^send\s+(.+)$/i,
                match => finish(match[1], "भेजें।")],
            [/^press\s+(.+)$/i,
                match => finish(match[1], "दबाकर कार्यशीलता जाँचें।")],
            [/^blow\s+down\s+and\s+drain\s+(.+)$/i,
                match => finish(match[1], "को ब्लो-डाउन करके पूरी तरह खाली करें।")],
            [/^read\s+off\s+(.+)$/i,
                match => finish(match[1], "की रीडिंग लेकर जाँचें।")],
            [/^liberally\s+apply\s+(.+)$/i,
                match => finish(match[1], "पर पर्याप्त मात्रा में लगाएँ।")],
            [/^after\s+(.+)$/i,
                match => finish(match[1], "के बाद निर्धारित कार्रवाई करें।")],
            [/^key\s+interlocking\s*:\s*(.+)$/i,
                match => finish(match[1], "की जाँच करके की-इंटरलॉकिंग की कार्यशीलता सुनिश्चित करें।")]
        ];

        for (const [pattern, formatter] of rules) {
            const match = activityText.match(pattern);
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
