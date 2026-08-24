import { describe, it, expect } from 'vitest';
import { parseOutlinesFromContent, createOutlineRecord } from '../domain/outlineImporter';
import { Outline } from '../types';

describe('OutlineImporter Module', () => {
  const existingOutlines: Outline[] = [
    { id: 1, title: 'Original Title 1', lastUsed: '2026-05-10', lastSpeakerId: 'sp1', lastCongregation: 'Green Heights' },
    { id: 2, title: 'Original Title 2', lastUsed: null, lastSpeakerId: null, lastCongregation: null }
  ];

  describe('parseOutlinesFromContent', () => {
    it('parses standard CSV with header and trims whitespace', () => {
      const csv = `Number,Title\n101,Who Is God?\n102,The Bible`;
      const result = parseOutlinesFromContent(csv);

      expect(result.success).toBe(true);
      expect(result.newCount).toBe(2);
      expect(result.updatedCount).toBe(0);
      expect(result.outlines).toEqual([
        { id: 101, title: 'Who Is God?', lastUsed: null, lastSpeakerId: null, lastCongregation: null },
        { id: 102, title: 'The Bible', lastUsed: null, lastSpeakerId: null, lastCongregation: null }
      ]);
    });

    it('correctly handles quoted fields with commas in title', () => {
      const csv = `"Number","Title","Last Used"\n"101","Making a Good Name, Part 1","2026-08-01"\n"102","Title, with, commas",""`;
      const result = parseOutlinesFromContent(csv);

      expect(result.success).toBe(true);
      expect(result.outlines.length).toBe(2);
      expect(result.outlines[0].id).toBe(101);
      expect(result.outlines[0].title).toBe('Making a Good Name, Part 1');
      expect(result.outlines[1].id).toBe(102);
      expect(result.outlines[1].title).toBe('Title, with, commas');
    });

    it('handles tab-separated and semicolon-separated lines', () => {
      const tsv = `101\tWho Is God?\n102\tThe Bible`;
      const tsvResult = parseOutlinesFromContent(tsv);
      expect(tsvResult.success).toBe(true);
      expect(tsvResult.outlines.length).toBe(2);

      const semi = `201;Who Is God?;2026-01-01\n202;The Bible;`;
      const semiResult = parseOutlinesFromContent(semi);
      expect(semiResult.success).toBe(true);
      expect(semiResult.outlines.length).toBe(2);
      expect(semiResult.outlines[0].title).toBe('Who Is God?');
    });

    it('handles plain text formatted outline lists (#, ., -, :)', () => {
      const text = `
        1. Who Is God?
        2 - The Bible
        #3 Making a Good Name With God
        Outline 4: Real Peace and Security
      `;
      const result = parseOutlinesFromContent(text);

      expect(result.success).toBe(true);
      expect(result.outlines.length).toBe(4);
      expect(result.outlines[0]).toEqual({ id: 1, title: 'Who Is God?', lastUsed: null, lastSpeakerId: null, lastCongregation: null });
      expect(result.outlines[1]).toEqual({ id: 2, title: 'The Bible', lastUsed: null, lastSpeakerId: null, lastCongregation: null });
      expect(result.outlines[2]).toEqual({ id: 3, title: 'Making a Good Name With God', lastUsed: null, lastSpeakerId: null, lastCongregation: null });
      expect(result.outlines[3]).toEqual({ id: 4, title: 'Real Peace and Security', lastUsed: null, lastSpeakerId: null, lastCongregation: null });
    });

    it('strips UTF-8 BOM from CSV files', () => {
      const bomCsv = `\uFEFF"Number","Title"\n"101","BOM Test"`;
      const result = parseOutlinesFromContent(bomCsv);

      expect(result.success).toBe(true);
      expect(result.outlines[0].id).toBe(101);
      expect(result.outlines[0].title).toBe('BOM Test');
    });

    it('parses JSON format arrays and backup payloads', () => {
      const jsonArray = JSON.stringify([
        { id: 10, title: 'Ten' },
        { id: '11', title: 'Eleven' }
      ]);
      const arrayResult = parseOutlinesFromContent(jsonArray);
      expect(arrayResult.success).toBe(true);
      expect(arrayResult.outlines.length).toBe(2);
      expect(arrayResult.outlines[0].id).toBe(10);
      expect(arrayResult.outlines[1].id).toBe(11);

      const backupJson = JSON.stringify({
        data: {
          outlines: [
            { id: 20, title: 'Twenty', lastUsed: '2026-01-01', lastSpeakerId: 's1', lastCongregation: 'Central' }
          ]
        }
      });
      const backupResult = parseOutlinesFromContent(backupJson);
      expect(backupResult.success).toBe(true);
      expect(backupResult.outlines[0].id).toBe(20);
      expect(backupResult.outlines[0].lastUsed).toBe('2026-01-01');
    });

    it('merges new outlines with existing ones while preserving historical metadata', () => {
      const csv = `1,Updated Title 1\n3,Brand New Outline`;
      const result = parseOutlinesFromContent(csv, existingOutlines);

      expect(result.success).toBe(true);
      expect(result.newCount).toBe(1);
      expect(result.updatedCount).toBe(1);
      expect(result.outlines.length).toBe(3);

      // Outline 1 should have updated title but preserved lastUsed and history
      const o1 = result.outlines.find(o => o.id === 1);
      expect(o1).toEqual({
        id: 1,
        title: 'Updated Title 1',
        lastUsed: '2026-05-10',
        lastSpeakerId: 'sp1',
        lastCongregation: 'Green Heights'
      });

      // Outline 2 is unchanged
      const o2 = result.outlines.find(o => o.id === 2);
      expect(o2?.title).toBe('Original Title 2');

      // Outline 3 is newly added
      const o3 = result.outlines.find(o => o.id === 3);
      expect(o3?.title).toBe('Brand New Outline');
      expect(o3?.lastUsed).toBeNull();
    });

    it('rejects binary file data with clear error', () => {
      const binaryData = `PK\x03\x04\x14\x00\x06\x00some zipped bytes`;
      const result = parseOutlinesFromContent(binaryData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Excel binary files');
    });

    it('returns error when no valid outlines could be parsed', () => {
      const invalid = `This is not an outline file\nJust random text`;
      const result = parseOutlinesFromContent(invalid);

      expect(result.success).toBe(false);
      expect(result.newCount).toBe(0);
    });

    it('correctly parses numbered outline titles containing internal commas', () => {
      const commaText = `
8. Mamuhay Para Gawin ang Kalooban ng Diyos, Hindi ang sa Atin
41. “Manatili Kayong Nakatayo, at Tingnan Ninyo ang Pagliligtas ni Jehova”
158. Magpakalakas-Loob, at Magtiwala kay Jehova
166. Tunay na Pananampalataya—Ano Ito, at Paano Ito Ipinapakita?
179. Tanggihan ang mga Ilusyon ng Sanlibutan, Itaguyod ang mga Katotohanan ng Kaharian
      `;

      const result = parseOutlinesFromContent(commaText);
      expect(result.success).toBe(true);
      expect(result.outlines.length).toBe(5);

      const o8 = result.outlines.find(o => o.id === 8);
      expect(o8?.title).toBe('Mamuhay Para Gawin ang Kalooban ng Diyos, Hindi ang sa Atin');

      const o41 = result.outlines.find(o => o.id === 41);
      expect(o41?.title).toBe('“Manatili Kayong Nakatayo, at Tingnan Ninyo ang Pagliligtas ni Jehova”');

      const o158 = result.outlines.find(o => o.id === 158);
      expect(o158?.title).toBe('Magpakalakas-Loob, at Magtiwala kay Jehova');

      const o166 = result.outlines.find(o => o.id === 166);
      expect(o166?.title).toBe('Tunay na Pananampalataya—Ano Ito, at Paano Ito Ipinapakita?');

      const o179 = result.outlines.find(o => o.id === 179);
      expect(o179?.title).toBe('Tanggihan ang mga Ilusyon ng Sanlibutan, Itaguyod ang mga Katotohanan ng Kaharian');
    });

    it('parses the full 194 outline prompt list completely and accurately', () => {
      const fullPromptList = `
1. Gaano Mo Kakilala ang Diyos?
2. Ikaw Ba ay Maliligtas sa mga Huling Araw?
3. Sumabay sa Pagsulong ng Nagkakaisang Organisasyon ni Jehova
4. Ebidensiya Mula sa Sangnilalang na May Diyos
5. Maaasahang Tulong Para sa Pamilya
6. Ikaw at ang Baha Noong Panahon ni Noe
7. Tularan ang “Ama ng Magiliw na Kaawaan”
8. Mamuhay Para Gawin ang Kalooban ng Diyos, Hindi ang sa Atin
9. Maging Tagapakinig at Tagatupad ng Salita ng Diyos
10. Maging Tapat sa Lahat ng Iyong Sinasabi at Ginagawa
11. “Hindi Bahagi ng Sanlibutan”—Bilang Pagtulad kay Kristo
12. Mahalaga sa Diyos ang Pananaw Mo sa Awtoridad
13. Makadiyos na Pananaw sa Sex at Pag-aasawa
14. Ang Isang Malinis na Bayan ay Nagpaparangal kay Jehova
15. ‘Gumawa ng Mabuti sa Lahat’
16. Patuloy na Patibayin ang Iyong Kaugnayan sa Diyos
17. Gamitin ang Lahat ng Taglay Mo Para Luwalhatiin ang Diyos
18. Gawin Mong Moog si Jehova
19. Paano Mo Malalaman ang Mangyayari sa Hinaharap?
20. Panahon Na Ba Para Mamahala ang Diyos sa Mundo?
21. Pahalagahan ang Papel Mo Bilang Sakop ng Kaharian
22. Nakikinabang Ka Ba sa mga Paglalaan ni Jehova?
23. Ang Tunay na Dahilan Kung Bakit Tayo Nabubuhay
24. Nakita Mo Na Ba ang “Mamahaling Perlas”?
25. Labanan ang Espiritu ng Sanlibutan!
26. Mahalaga Ka Ba sa Diyos?
27. Isang Magandang Pasimula sa Pag-aasawa
28. Magpakita ng Paggalang at Pag-ibig sa Inyong Pag-aasawa
29. Mga Pananagutan at Gantimpala ng mga Magulang
30. Paano Magkakaroon ng Magandang Komunikasyon sa Loob ng Pamilya?
31. Palaisip Ka Ba sa Iyong Espirituwal na Pangangailangan?
32. Pagharap sa mga Álalahanín sa Buhay
33. Makakamit Pa Kaya Natin ang Tunay na Katarungan?
34. Tatanggap Ka Ba ng Marka ng Kaligtasan?
35. Posible Bang Mabuhay Magpakailanman? Mararanasan Mo Ba Ito?
36. Ganito Na Lang Ba ang Buhay?
37. Talaga Bang Kapaki-pakinabang ang mga Daan ng Diyos?
38. Paano Ka Makakaligtas sa Katapusan ng Mundo?
39. Dinaig ni Jesu-Kristo ang Mundo—Paano at Kailan?
40. Ano ang Malapit Nang Mangyari sa Hinaharap?
41. “Manatili Kayong Nakatayo, at Tingnan Ninyo ang Pagliligtas ni Jehova”
42. Magtatagumpay Ba ang Pag-ibig Laban sa Poot?
43. Mga Kahilingan ng Diyos—Laging Kapaki-pakinabang
44. Paano Ka Makikinabang sa mga Turo ni Jesus?
45. Sundan ang Daan Patungo sa Buhay
46. Panatilihing Matatag ang Iyong Pagtitiwala Hanggang sa Wakas
47. “Manampalataya sa Mabuting Balita”
48. Manatiling Tapat Bilang Kristiyano sa Kabila ng Pagsubok
49. Isang Nilinis na Lupa—Posible Ba?
50. Kung Paano Magdedesisyon na Aakay sa Tagumpay
51. Binabago Ba ng Katotohanan ang Iyong Buhay?
52. Sino ang Diyos Mo?
53. Kaayon Ba ng Kaisipan ng Diyos ang Kaisipan Mo?
54. Patibayin ang Pananampalataya Mo sa Diyos at sa mga Pangako Niya
55. Paano Ka Magkakaroon ng Mabuting Pangalan sa Diyos?
56. Sinong Lider ang Pagtitiwalaan Mo?
57. Pagtitiis sa Ilalim ng Pag-uusig
58. Sino ang Tunay na mga Tagasunod ni Kristo?
59. Aanihin Ninyo ang Inyong Inihasik
60. Ano ang Layunin Mo sa Buhay?
61. Kaninong mga Pangako Ka Nagtitiwala?
62. Saan Ka Makakahanap ng Tunay na Pag-asa?
63. Posible Bang Makita ang Katotohanan?
64. Ikaw Ba ay “Maibigin sa Kaluguran” o “Maibigin sa Diyos”?
65. Kung Paano Itataguyod ang Kapayapaan sa Isang Galít na Mundo
66. Puwede Ka Bang Maging Manggagawa sa Pag-aani?
67. Bulay-bulayin ang Salita ni Jehova at ang mga Gawa Niya
68. “Patuloy Ninyong . . . Lubusang Patawarin ang Isa’t Isa”
69. Bakit Dapat Magpakita ng Mapagsakripisyong Pag-ibig?
70. Bakit Dapat Kang Magtiwala sa Diyos?
71. ‘Manatiling Gisíng’—Bakit at Paano?
72. Pag-ibig ang Pagkakakilanlan ng Tunay na Kongregasyong Kristiyano
73. Magkaroon ng “Marunong na Puso”
74. Nakikita Tayo ni Jehova
75. Ipakita sa Buhay Mo na Sinusuportahan Mo ang Pamamahala ni Jehova
76. Mga Simulain sa Bibliya—Matutulungan Ba Tayo Nito na Harapin ang mga Problema Ngayon?
77. “Maging Mapagpatuloy Kayo”
78. Maglingkod kay Jehova Nang May Masayang Puso
79. Sino ang Pipiliin Mong Kaibigan?
80. Umaasa Ka Ba sa Siyensiya o sa Bibliya?
81. Sino ang Kuwalipikadong Gumawa ng mga Alagad?
82. Si Jehova at si Kristo—Sila Ba ay Bahagi ng Isang Trinidad?
83. Dapat Bang Sundin ng mga Kristiyano ang Sampung Utos?
84. Makatatakas Ba Kayo sa Kahihinatnan ng Daigdig na Ito?
85. Mabuting Balita sa Isang Marahas na Sanlibutan
86. Mga Panalangin na Pinapakinggan ng Diyos
87. Ano ang Inyong Kaugnayan sa Diyos?
88. Bakit Dapat Mamuhay Ayon sa mga Pamantayan sa Bibliya?
89. Halikayo, Kayong Nauuhaw sa Katotohanan!
90. Abutin ang Tunay na Buhay!
91. Ang Pagkanaririto ng Mesiyas at ang Kaniyang Pamamahala
92. Ang Bahagi ng Relihiyon sa mga Pangyayari sa Daigdig
93. Likas na mga Sakuna—Matatapos Pa Kaya?
94. Natutugunan ng Tunay na Relihiyon ang Pangangailangan ng Lipunan ng Tao
95. Huwag Magpadaya sa Espiritismo!
96. Ano ang Mangyayari sa Relihiyon?
97. Manatiling Walang Kapintasan sa Gitna ng Isang Likong Salinlahi
98. “Ang Eksena sa Sanlibutang Ito ay Nagbabago”
99. Makakapagtiwala Ka sa Bibliya
100. Kung Paano Magkakaroon ng Matibay at Nagtatagal na Pagkakaibigan
101. Si Jehova ang “Dakilang Maylalang”
102. Magbigay-Pansin sa “Hula”
103. Paano Ka Magkakaroon ng Tunay na Kagalakan?
104. Mga Magulang—Nagtatayo Ba Kayo Gamit ang mga Materyales na Hindi Tinatablan ng Apoy?
105. Pagtatamo ng Kaaliwan sa Lahat ng Ating Kapighatian
106. Ang Pagsira sa Lupa ay Magdadala ng Banal na Paghihiganti
107. Nakikinabang Ka Ba sa Isang Sinanay na Konsensiya?
108. Magtiwala sa Magandang Kinabukasan na Ipinangako ng Diyos!
109. Malapit Na ang Kaharian ng Diyos
110. Inuuna ang Diyos sa Matagumpay na Buhay Pampamilya
111. Lubusang Pagpapagaling sa mga Tao—Paano?
112. Magpakita ng Pag-ibig sa Isang Makasariling Mundo
113. Paano Makakamit ng mga Kabataan ang Tagumpay at Kaligayahan?
114. Pagpapahalaga sa mga Kamangha-manghang Paglalang ng Diyos
115. Protektahan ang Sarili Mo Mula sa Tusong mga Pakana ni Satanas
116. Pumili ng Inyong mga Kasama Nang May Katalinuhan!
117. Kung Paano Dadaigin ng Mabuti ang Masama
118. Pagmamasid sa mga Kabataan Mula sa Pangmalas ni Jehova
119. Pagiging Hiwalay ng Kristiyano sa Sanlibutan—Bakit Kapaki-pakinabang
120. Kung Bakit Magpapasakop sa Pamamahala ng Diyos Ngayon
121. Isang Pandaigdig na Kapatirang Makakaligtas sa Kalamidad
122. Pangglobong Kapayapaan—Saan Magmumula?
123. Kung Bakit Kailangang Maging Kakaiba ang mga Kristiyano
124. Saligan ng Pagtitiwala na ang Diyos ang May-akda ng Bibliya
125. Kung Bakit Kailangan ng Sangkatauhan ang Isang Pantubos
126. Sino ang Makaliligtas?
127. Ano ang Nangyayari Kapag Tayo ay Namatay?
128. Talaga Bang ang Impiyerno ay Isang Dako ng Maapoy na Pagpapahirap?
129. Turo Ba ng Bibliya ang Trinidad?
130. Ang Lupa ay Mananatili Magpakailanman
131. Manindigan at Labanan ang Diyablo!
132. Ang Pagkabuhay-Muli—Tagumpay Laban sa Kamatayan!
133. Ang Pinagmulan ng Tao—Mahalaga Ba Kung Ano ang Iyong Pinaniniwalaan?
134. Dapat Bang Sundin ng mga Kristiyano ang Sabbath?
135. Ang Kabanalan ng Buhay at Dugo
136. Sinasang-ayunan Ba ng Diyos ang Paggamit ng mga Imahen sa Pagsamba?
137. Talaga Bang Nangyari ang mga Himala sa Bibliya?
138. Mamuhay Taglay ang Katinuan ng Pag-iisip sa Isang Masamang Sanlibutan
139. Makadiyos na Karunungan sa Isang Makasiyensiyang Sanlibutan
140. Sino Ba Talaga si Jesu-Kristo?
141. Ang Pagdaing ng mga Taong Nilalang—Kailan Ito Magwawakas?
142. Kung Bakit Manganganlong kay Jehova
143. Magtiwala sa Diyos ng Buong Kaaliwan
144. Isang Matapat na Kongregasyon sa Ilalim ng Pangunguna ni Kristo
145. Sino ang Tulad ni Jehova na Ating Diyos?
146. Gamitin ang Edukasyon Upang Purihin si Jehova
147. Magtiwala sa Kakayahan ni Jehova Magligtas
148. Kaisa Ka Ba ng Pangmalas ng Diyos sa Buhay?
149. Ikaw Ba ay Lumalakad na Kasama ng Diyos?
150. Itinalaga Bang Mawasak ang Sanlibutang Ito?
151. Si Jehova ay Isang “Matibay na Kaitaasan” Para sa Kaniyang Bayan
152. Ang Tunay na Armagedon—Bakit? Kailan?
153. Isaisip ang “Kamangha-manghang Araw”!
154. Ang Pamamahala ng Tao—Tinimbang
155. Dumating Na ba ang Oras ng Paghatol sa Babilonya?
156. Araw ng Paghuhukom—Panahon ng Takot o Pag-asa?
157. Kung Paano Ginagayakan ng Tunay na mga Kristiyano ang Turo ng Diyos
158. Magpakalakas-Loob, at Magtiwala kay Jehova
159. Pagkasumpong ng Katiwasayan sa Isang Mapanganib na Daigdig
160. Ingatan ang Inyong Pagkakakilanlan Bilang Kristiyano!
161. Bakit Nagdusa at Namatay si Jesus?
162. Kaligtasan Mula sa Isang Sanlibutan ng Kadiliman
163. Bakit Dapat Matakot sa Tunay na Diyos?
164. Kontrolado Pa Ba ng Diyos ang mga Bagay-bagay?
165. Kaninong Pamantayan ang Pinahahalagahan Mo?
166. Tunay na Pananampalataya—Ano Ito, at Paano Ito Ipinapakita?
167. Kumilos Nang May Karunungan sa Isang Hangal na Sanlibutan
168. Maaari Kang Maging Panatag sa Magulong Daigdig na Ito!
169. Bakit Dapat Mong Gawing Patnubay ang Bibliya?
170. Sino ang Kuwalipikadong Mamahala sa Sangkatauhan?
171. Maaari Kang Magkaroon ng Mapayapang Buhay Ngayon—At Magpakailanman!
172. Ano ang Katayuan Mo sa Harap ng Diyos?
173. Iisa Lang ba ang Tunay na Relihiyon Ayon sa Pangmalas ng Diyos?
174. Bagong Sanlibutang Ipinangako ng Diyos—Sino ang Karapat-dapat Dito?
175. Paano Tayo Makatitiyak na Totoo ang Bibliya?
176. Tunay na Kapayapaan at Katiwasayan—Kailan?
177. Saan Ka Makakakuha ng Tulong sa Panahon ng Kabagabagan?
178. Lumakad sa Daan ng Katapatan
179. Tanggihan ang mga Ilusyon ng Sanlibutan, Itaguyod ang mga Katotohanan ng Kaharian
180. Ang Pagkabuhay-Muli—Kung Bakit Dapat Maging Totoo sa Iyo ang Pag-asang Iyan
181. Mas Malapit Na Ba ang Wakas Kaysa sa Iniisip Mo?
182. Kung Ano ang Ginagawa Ngayon ng Kaharian ng Diyos Para sa Atin
183. Huwag Tumingin sa mga Bagay na Walang Kabuluhan!
184. Kamatayan Ba ang Wakas ng Lahat?
185. Nakaaapekto Ba ang Katotohanan sa Iyong Buhay?
186. Makiisa sa Maligayang Bayan ng Diyos
187. Bakit Pinahihintulutan ng Maibiging Diyos ang Kasamaan?
188. Nagtitiwala Ka Ba kay Jehova?
189. Ang Paglakad na Kasama ng Diyos ay Nagdudulot ng mga Pagpapala Ngayon at Magpakailanman
190. Pagkakaroon ng Maligayang Pamilya—Isang Katiyakan
191. Kung Paano Dinaraig ng Pag-ibig at Pananampalataya ang Sanlibutan
192. Ikaw Ba ay Nasa Daan Tungo sa Buhay na Walang Hanggan?
193. Malapit Na ang Isang Daigdig na Walang Kabagabagan
194. Kung Paano Tayo Nakikinabang sa Karunungan Mula sa Diyos
      `;

      const result = parseOutlinesFromContent(fullPromptList);
      expect(result.success).toBe(true);
      expect(result.outlines.length).toBe(194);
      expect(result.newCount).toBe(194);

      // Verify outline 1 to 194 exist sequentially
      for (let i = 1; i <= 194; i++) {
        const found = result.outlines.find(o => o.id === i);
        expect(found, `Outline #${i} must exist`).toBeDefined();
        expect(found?.title.length).toBeGreaterThan(0);
      }

      // Check specific tricky titles
      expect(result.outlines.find(o => o.id === 8)?.title).toBe('Mamuhay Para Gawin ang Kalooban ng Diyos, Hindi ang sa Atin');
      expect(result.outlines.find(o => o.id === 41)?.title).toBe('“Manatili Kayong Nakatayo, at Tingnan Ninyo ang Pagliligtas ni Jehova”');
      expect(result.outlines.find(o => o.id === 158)?.title).toBe('Magpakalakas-Loob, at Magtiwala kay Jehova');
      expect(result.outlines.find(o => o.id === 166)?.title).toBe('Tunay na Pananampalataya—Ano Ito, at Paano Ito Ipinapakita?');
      expect(result.outlines.find(o => o.id === 179)?.title).toBe('Tanggihan ang mga Ilusyon ng Sanlibutan, Itaguyod ang mga Katotohanan ng Kaharian');
      expect(result.outlines.find(o => o.id === 194)?.title).toBe('Kung Paano Tayo Nakikinabang sa Karunungan Mula sa Diyos');
    });
  });

  describe('createOutlineRecord', () => {
    it('creates a valid outline object', () => {
      const res = createOutlineRecord('105', '  Future Hope  ', existingOutlines);
      expect(res.error).toBeUndefined();
      expect(res.outline).toEqual({
        id: 105,
        title: 'Future Hope',
        lastUsed: null,
        lastSpeakerId: null,
        lastCongregation: null
      });
    });

    it('rejects duplicate outline ID', () => {
      const res = createOutlineRecord(1, 'Duplicate Outline', existingOutlines);
      expect(res.outline).toBeUndefined();
      expect(res.error).toContain('already exists');
    });

    it('rejects invalid or non-positive ID', () => {
      const resNaN = createOutlineRecord('abc', 'Valid Title', existingOutlines);
      expect(resNaN.error).toBeDefined();

      const resZero = createOutlineRecord(0, 'Valid Title', existingOutlines);
      expect(resZero.error).toBeDefined();

      const resNeg = createOutlineRecord(-5, 'Valid Title', existingOutlines);
      expect(resNeg.error).toBeDefined();
    });

    it('rejects empty title', () => {
      const res = createOutlineRecord(106, '   ', existingOutlines);
      expect(res.outline).toBeUndefined();
      expect(res.error).toContain('title');
    });
  });
});
