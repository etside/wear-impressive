/* eslint-disable */
// THIS FILE IS GENERATED — run `node frontend/scripts/generate-areas.cjs` to regenerate.
// Source: glowup-front-back-end/backend/database/seeders/AreaSeeder.php
//
// Hierarchy: district -> thana -> Area[].
// Stats: 63 districts · 352 thanas · 1079 areas.
//
// Note: this is the *legacy* spelling from the seeder ("Barisal", "Comilla",
// "Chittagong"); the canonical names in bangladesh-locations.ts use the new
// official spellings ("Barishal", "Cumilla", "Chattogram"). Helpers below
// alias both spellings so a saved address from either era resolves.

export interface Area {
  name: string;
  postal_code: string;
}

export const areasByDistrictThana: Record<string, Record<string, Area[]>> = {
  "Bagerhat": {
    "Bagerhat Sadar": [
      {
        "name": "P.C College",
        "postal_code": "9301"
      },
      {
        "name": "Rangdia",
        "postal_code": "9302"
      },
      {
        "name": "Rayenda",
        "postal_code": "9330"
      }
    ],
    "Chitalmari": [
      {
        "name": "Barabaria",
        "postal_code": "9361"
      }
    ],
    "Fakirhat": [
      {
        "name": "Bhanganpar Bazar",
        "postal_code": "9372"
      },
      {
        "name": "Mansa",
        "postal_code": "9371"
      }
    ],
    "Kachua": [
      {
        "name": "Sonarkola",
        "postal_code": "9311"
      }
    ],
    "Mollahat": [
      {
        "name": "Charkulia",
        "postal_code": "9383"
      },
      {
        "name": "Dariala",
        "postal_code": "9382"
      },
      {
        "name": "Kahalpur",
        "postal_code": "9381"
      },
      {
        "name": "Nagarkandi",
        "postal_code": "9384"
      },
      {
        "name": "Pak Gangni",
        "postal_code": "9385"
      }
    ],
    "Mongla": [
      {
        "name": "Chalna Ankorage",
        "postal_code": "9350"
      },
      {
        "name": "Mongla Port",
        "postal_code": "9351"
      }
    ],
    "Morrelganj": [
      {
        "name": "Morelganj",
        "postal_code": "9320"
      },
      {
        "name": "Sannasi Bazar",
        "postal_code": "9321"
      },
      {
        "name": "Telisatee",
        "postal_code": "9322"
      }
    ],
    "Rampal": [
      {
        "name": "Foylahat",
        "postal_code": "9341"
      },
      {
        "name": "Gourambha",
        "postal_code": "9343"
      },
      {
        "name": "Sonatunia",
        "postal_code": "9342"
      }
    ]
  },
  "Bandarban": {
    "Rowangchhari": [
      {
        "name": "Roangchhari",
        "postal_code": "4610"
      }
    ]
  },
  "Barguna": {
    "Barguna Sadar": [
      {
        "name": "Nali Bandar",
        "postal_code": "8701"
      }
    ],
    "Betagi": [
      {
        "name": "Darul Ulam",
        "postal_code": "8741"
      }
    ],
    "Patharghata": [
      {
        "name": "Kakchira",
        "postal_code": "8721"
      }
    ]
  },
  "Barisal": {
    "Agailjhara": [
      {
        "name": "Agailzhara",
        "postal_code": "8240"
      },
      {
        "name": "Gaila",
        "postal_code": "8241"
      },
      {
        "name": "Paisarhat",
        "postal_code": "8242"
      }
    ],
    "Babuganj": [
      {
        "name": "Barishal Cadet",
        "postal_code": "8216"
      },
      {
        "name": "Chandpasha",
        "postal_code": "8212"
      },
      {
        "name": "Madhabpasha",
        "postal_code": "8213"
      },
      {
        "name": "Nizamuddin College",
        "postal_code": "8215"
      },
      {
        "name": "Rahamatpur",
        "postal_code": "8211"
      },
      {
        "name": "Thakur Mallik",
        "postal_code": "8214"
      }
    ],
    "Banaripara": [
      {
        "name": "Barajalia",
        "postal_code": "8260"
      },
      {
        "name": "Osman Manjil",
        "postal_code": "8261"
      }
    ],
    "Barisal Sadar": [
      {
        "name": "Barishal Sadar",
        "postal_code": "8200"
      },
      {
        "name": "Bukhainagar",
        "postal_code": "8201"
      },
      {
        "name": "Charamandi",
        "postal_code": "8281"
      },
      {
        "name": "Jaguarhat",
        "postal_code": "8206"
      },
      {
        "name": "kalaskati",
        "postal_code": "8284"
      },
      {
        "name": "Kashipur",
        "postal_code": "8205"
      },
      {
        "name": "Padri Shibpur",
        "postal_code": "8282"
      },
      {
        "name": "Patang",
        "postal_code": "8204"
      },
      {
        "name": "Saheberhat",
        "postal_code": "8202"
      },
      {
        "name": "Sahebganj",
        "postal_code": "8280"
      },
      {
        "name": "Shialguni",
        "postal_code": "8283"
      },
      {
        "name": "Sugandia",
        "postal_code": "8203"
      }
    ],
    "Gaurnadi": [
      {
        "name": "Batajor",
        "postal_code": "8233"
      },
      {
        "name": "Gouranadi",
        "postal_code": "8230"
      },
      {
        "name": "Kashemabad",
        "postal_code": "8232"
      },
      {
        "name": "Tarki Bandar",
        "postal_code": "8231"
      }
    ],
    "Mehendiganj": [
      {
        "name": "Langutia",
        "postal_code": "8274"
      },
      {
        "name": "Laskarpur",
        "postal_code": "8271"
      },
      {
        "name": "Mahendiganj",
        "postal_code": "8270"
      },
      {
        "name": "Nalgora",
        "postal_code": "8273"
      },
      {
        "name": "Ulania",
        "postal_code": "8272"
      }
    ],
    "Muladi": [
      {
        "name": "Charkalekhan",
        "postal_code": "8252"
      },
      {
        "name": "Kazirchar",
        "postal_code": "8251"
      }
    ],
    "Wazirpur": [
      {
        "name": "Dakuarhat",
        "postal_code": "8223"
      },
      {
        "name": "Dhamura",
        "postal_code": "8221"
      },
      {
        "name": "Jugirkanda",
        "postal_code": "8222"
      },
      {
        "name": "Shikarpur",
        "postal_code": "8224"
      },
      {
        "name": "Uzirpur",
        "postal_code": "8220"
      }
    ]
  },
  "Bhola": {
    "Bhola Sadar": [
      {
        "name": "Hajirhat",
        "postal_code": "8360"
      },
      {
        "name": "Hatshoshiganj",
        "postal_code": "8350"
      },
      {
        "name": "Joynagar",
        "postal_code": "8301"
      }
    ],
    "Burhanuddin": [
      {
        "name": "Borhanuddin",
        "postal_code": "8320"
      },
      {
        "name": "Mirzakalu",
        "postal_code": "8321"
      }
    ],
    "Char Fasson": [
      {
        "name": "Charfashion",
        "postal_code": "8340"
      },
      {
        "name": "Dularhat",
        "postal_code": "8341"
      },
      {
        "name": "Keramatganj",
        "postal_code": "8342"
      }
    ],
    "Daulatkhan": [
      {
        "name": "Doulatkhan",
        "postal_code": "8310"
      },
      {
        "name": "Hajipur",
        "postal_code": "8311"
      }
    ],
    "Lalmohan": [
      {
        "name": "Daurihat",
        "postal_code": "8331"
      },
      {
        "name": "Gazaria",
        "postal_code": "8332"
      }
    ]
  },
  "Bogura": {
    "Adamdighi": [
      {
        "name": "Nasharatpur",
        "postal_code": "5892"
      },
      {
        "name": "Santahar",
        "postal_code": "5891"
      }
    ],
    "Bogura Sadar": [
      {
        "name": "Bogra Canttonment",
        "postal_code": "5801"
      },
      {
        "name": "Bogra Sadar",
        "postal_code": "5800"
      }
    ],
    "Dhunat": [
      {
        "name": "Gosaibari",
        "postal_code": "5851"
      }
    ],
    "Dhupchanchia": [
      {
        "name": "Dupchachia",
        "postal_code": "5880"
      },
      {
        "name": "Talora",
        "postal_code": "5881"
      }
    ],
    "Gabtali": [
      {
        "name": "Gabtoli",
        "postal_code": "5820"
      },
      {
        "name": "Sukhanpukur",
        "postal_code": "5821"
      }
    ],
    "Kahaloo": [
      {
        "name": "Kahalu",
        "postal_code": "5870"
      }
    ],
    "Sariakandi": [
      {
        "name": "Chandan Baisha",
        "postal_code": "5831"
      }
    ],
    "Sherpur": [
      {
        "name": "Chandaikona",
        "postal_code": "5841"
      },
      {
        "name": "Palli Unnyan Accadem",
        "postal_code": "5842"
      }
    ],
    "Sonatala": [
      {
        "name": "Sonatola",
        "postal_code": "5826"
      }
    ]
  },
  "Brahmanbaria": {
    "Akhaura": [
      {
        "name": "Azampur",
        "postal_code": "3451"
      },
      {
        "name": "Gangasagar",
        "postal_code": "3452"
      }
    ],
    "Bancharampur": [
      {
        "name": "Banchharampur",
        "postal_code": "3420"
      }
    ],
    "Brahmanbaria Sadar": [
      {
        "name": "Ashuganj",
        "postal_code": "3402"
      },
      {
        "name": "Ashuganj Share",
        "postal_code": "3403"
      },
      {
        "name": "Brahamanbaria Sadar",
        "postal_code": "3400"
      },
      {
        "name": "Poun",
        "postal_code": "3404"
      },
      {
        "name": "Talshahar",
        "postal_code": "3401"
      }
    ],
    "Kasba": [
      {
        "name": "Chandidar",
        "postal_code": "3462"
      },
      {
        "name": "Chargachh",
        "postal_code": "3463"
      },
      {
        "name": "Gopinathpur",
        "postal_code": "3464"
      },
      {
        "name": "Kuti",
        "postal_code": "3461"
      }
    ],
    "Nabinagar": [
      {
        "name": "Jibanganj",
        "postal_code": "3419"
      },
      {
        "name": "Kaitala",
        "postal_code": "3417"
      },
      {
        "name": "Laubfatehpur",
        "postal_code": "3411"
      },
      {
        "name": "Rasullabad",
        "postal_code": "3412"
      },
      {
        "name": "Ratanpur",
        "postal_code": "3414"
      },
      {
        "name": "Salimganj",
        "postal_code": "3418"
      },
      {
        "name": "Shahapur",
        "postal_code": "3415"
      },
      {
        "name": "Shamgram",
        "postal_code": "3413"
      }
    ],
    "Nasirnagar": [
      {
        "name": "Fandauk",
        "postal_code": "3441"
      }
    ],
    "Sarail": [
      {
        "name": "Chandura",
        "postal_code": "3432"
      },
      {
        "name": "Sarial",
        "postal_code": "3430"
      },
      {
        "name": "Shahbajpur",
        "postal_code": "3431"
      }
    ]
  },
  "Chandpur": {
    "Chandpur Sadar": [
      {
        "name": "Baburhat",
        "postal_code": "3602"
      },
      {
        "name": "Puranbazar",
        "postal_code": "3601"
      },
      {
        "name": "Sahatali",
        "postal_code": "3603"
      }
    ],
    "Faridganj": [
      {
        "name": "Chandra",
        "postal_code": "3651"
      },
      {
        "name": "Gridkaliandia",
        "postal_code": "3653"
      },
      {
        "name": "Islampur Shah Isain",
        "postal_code": "3655"
      },
      {
        "name": "Rampurbazar",
        "postal_code": "3654"
      },
      {
        "name": "Rupsha",
        "postal_code": "3652"
      }
    ],
    "Haimchar": [
      {
        "name": "Gandamara",
        "postal_code": "3661"
      },
      {
        "name": "Hayemchar",
        "postal_code": "3660"
      }
    ],
    "Haziganj": [
      {
        "name": "Bolakhal",
        "postal_code": "3611"
      },
      {
        "name": "Hajiganj",
        "postal_code": "3610"
      }
    ],
    "Kachua": [
      {
        "name": "Pak Shrirampur",
        "postal_code": "3631"
      },
      {
        "name": "Rahima Nagar",
        "postal_code": "3632"
      },
      {
        "name": "Shachar",
        "postal_code": "3633"
      }
    ],
    "Matlab Dakshin": [
      {
        "name": "Kalipur",
        "postal_code": "3642"
      },
      {
        "name": "Matlobganj",
        "postal_code": "3640"
      },
      {
        "name": "Mohanpur",
        "postal_code": "3641"
      }
    ],
    "Shahrasti": [
      {
        "name": "Chotoshi",
        "postal_code": "3623"
      },
      {
        "name": "Islamia Madrasha",
        "postal_code": "3624"
      },
      {
        "name": "Khilabazar",
        "postal_code": "3621"
      },
      {
        "name": "Pashchim Kherihar Al",
        "postal_code": "3622"
      }
    ]
  },
  "Chapainawabganj": {
    "Chapainawabganj Sadar": [
      {
        "name": "Amnura",
        "postal_code": "6303"
      },
      {
        "name": "Chapinawbganj Sadar",
        "postal_code": "6300"
      },
      {
        "name": "Rajarampur",
        "postal_code": "6301"
      },
      {
        "name": "Ramchandrapur",
        "postal_code": "6302"
      }
    ],
    "Gomastapur": [
      {
        "name": "Gomashtapur",
        "postal_code": "6321"
      },
      {
        "name": "Rohanpur",
        "postal_code": "6320"
      }
    ],
    "Nachole": [
      {
        "name": "Mandumala",
        "postal_code": "6311"
      },
      {
        "name": "Nachol",
        "postal_code": "6310"
      }
    ],
    "Shibganj": [
      {
        "name": "Kansart",
        "postal_code": "6341"
      },
      {
        "name": "Manaksha",
        "postal_code": "6342"
      },
      {
        "name": "Shibganj U.P.O",
        "postal_code": "6340"
      }
    ]
  },
  "Chittagong": {
    "Anwara": [
      {
        "name": "Anowara",
        "postal_code": "4376"
      },
      {
        "name": "Battali",
        "postal_code": "4378"
      },
      {
        "name": "Paroikora",
        "postal_code": "4377"
      }
    ],
    "Banshkhali": [
      {
        "name": "Banigram",
        "postal_code": "4393"
      },
      {
        "name": "Gunagari",
        "postal_code": "4392"
      },
      {
        "name": "Jaldi",
        "postal_code": "4390"
      },
      {
        "name": "Khan Bahadur Bazar",
        "postal_code": "4391"
      }
    ],
    "Boalkhali": [
      {
        "name": "Charandwip",
        "postal_code": "4369"
      },
      {
        "name": "Iqbal Park",
        "postal_code": "4365"
      },
      {
        "name": "Kadurkhal",
        "postal_code": "4368"
      },
      {
        "name": "Kanungopara",
        "postal_code": "4363"
      },
      {
        "name": "Sakpura",
        "postal_code": "4367"
      },
      {
        "name": "Saroatoli",
        "postal_code": "4364"
      }
    ],
    "Chandanaish": [
      {
        "name": "Barma",
        "postal_code": "4383"
      },
      {
        "name": "Dohazari",
        "postal_code": "4382"
      },
      {
        "name": "East Joara",
        "postal_code": "4380"
      },
      {
        "name": "Gachbaria",
        "postal_code": "4381"
      }
    ],
    "Fatikchhari": [
      {
        "name": "Bhandar Sharif",
        "postal_code": "4352"
      },
      {
        "name": "Harualchhari",
        "postal_code": "4354"
      },
      {
        "name": "Najirhat",
        "postal_code": "4353"
      },
      {
        "name": "Nanupur",
        "postal_code": "4351"
      },
      {
        "name": "Narayanhat",
        "postal_code": "4355"
      }
    ],
    "Hathazari": [
      {
        "name": "Chitt.University",
        "postal_code": "4331"
      },
      {
        "name": "Fatahabad",
        "postal_code": "4335"
      },
      {
        "name": "Gorduara",
        "postal_code": "4332"
      },
      {
        "name": "Katirhat",
        "postal_code": "4333"
      },
      {
        "name": "Madrasa",
        "postal_code": "4339"
      },
      {
        "name": "Mirzapur",
        "postal_code": "4334"
      },
      {
        "name": "Nuralibari",
        "postal_code": "4337"
      },
      {
        "name": "Yunus Nagar",
        "postal_code": "4338"
      }
    ],
    "Kotwali": [
      {
        "name": "Al- Amin Baria Madra",
        "postal_code": "4221"
      },
      {
        "name": "Amin Jute Mills",
        "postal_code": "4211"
      },
      {
        "name": "Anandabazar",
        "postal_code": "4215"
      },
      {
        "name": "Bayezid Bostami",
        "postal_code": "4210"
      },
      {
        "name": "Chandgaon",
        "postal_code": "4212"
      },
      {
        "name": "Chawkbazar",
        "postal_code": "4203"
      },
      {
        "name": "Chitt. Cantonment",
        "postal_code": "4220"
      },
      {
        "name": "Chitt. Customs Acca",
        "postal_code": "4219"
      },
      {
        "name": "Chitt. Politechnic In",
        "postal_code": "4209"
      },
      {
        "name": "Chitt. Sailers Colon",
        "postal_code": "4218"
      },
      {
        "name": "Chittagong",
        "postal_code": "4000"
      },
      {
        "name": "Chittagong Airport",
        "postal_code": "4205"
      },
      {
        "name": "Chittagong Bandar",
        "postal_code": "4100"
      },
      {
        "name": "Export Processing",
        "postal_code": "4223"
      },
      {
        "name": "Firozshah",
        "postal_code": "4207"
      },
      {
        "name": "Halishahar",
        "postal_code": "4216"
      },
      {
        "name": "Halishshar",
        "postal_code": "4225"
      },
      {
        "name": "Jalalabad",
        "postal_code": "4214"
      },
      {
        "name": "Jaldia Merine Accade",
        "postal_code": "4206"
      },
      {
        "name": "Middle Patenga",
        "postal_code": "4222"
      },
      {
        "name": "Mohard",
        "postal_code": "4208"
      },
      {
        "name": "North Halishahar",
        "postal_code": "4226"
      },
      {
        "name": "North Katuli",
        "postal_code": "4217"
      },
      {
        "name": "Pahartoli",
        "postal_code": "4202"
      },
      {
        "name": "Patenga",
        "postal_code": "4204"
      },
      {
        "name": "Rampura",
        "postal_code": "4224"
      },
      {
        "name": "Wazedia",
        "postal_code": "4213"
      }
    ],
    "Lohagara": [
      {
        "name": "Chaunti",
        "postal_code": "4398"
      },
      {
        "name": "Padua",
        "postal_code": "4397"
      }
    ],
    "Mirsharai": [
      {
        "name": "Abutorab",
        "postal_code": "4321"
      },
      {
        "name": "Azampur",
        "postal_code": "4325"
      },
      {
        "name": "Bharawazhat",
        "postal_code": "4323"
      },
      {
        "name": "Darrogahat",
        "postal_code": "4322"
      },
      {
        "name": "Joarganj",
        "postal_code": "4324"
      },
      {
        "name": "Korerhat",
        "postal_code": "4327"
      },
      {
        "name": "Mohazanhat",
        "postal_code": "4328"
      }
    ],
    "Patiya": [
      {
        "name": "Budhpara",
        "postal_code": "4371"
      },
      {
        "name": "Patia Head Office",
        "postal_code": "4370"
      }
    ],
    "Rangunia": [
      {
        "name": "Dhamair",
        "postal_code": "4361"
      }
    ],
    "Raozan": [
      {
        "name": "B.I.T Post Office",
        "postal_code": "4349"
      },
      {
        "name": "Beenajuri",
        "postal_code": "4341"
      },
      {
        "name": "Dewanpur",
        "postal_code": "4347"
      },
      {
        "name": "Fatepur",
        "postal_code": "4345"
      },
      {
        "name": "Gahira",
        "postal_code": "4343"
      },
      {
        "name": "Guzra Noapara",
        "postal_code": "4346"
      },
      {
        "name": "jagannath Hat",
        "postal_code": "4344"
      },
      {
        "name": "Kundeshwari",
        "postal_code": "4342"
      },
      {
        "name": "Mohamuni",
        "postal_code": "4348"
      },
      {
        "name": "Rouzan",
        "postal_code": "4340"
      }
    ],
    "Sandwip": [
      {
        "name": "Shiberhat",
        "postal_code": "4301"
      },
      {
        "name": "Urirchar",
        "postal_code": "4302"
      }
    ],
    "Satkania": [
      {
        "name": "Baitul Ijjat",
        "postal_code": "4387"
      },
      {
        "name": "Bazalia",
        "postal_code": "4388"
      }
    ],
    "Sitakunda": [
      {
        "name": "Barabkunda",
        "postal_code": "4312"
      },
      {
        "name": "Baroidhala",
        "postal_code": "4311"
      },
      {
        "name": "Bawashbaria",
        "postal_code": "4313"
      },
      {
        "name": "Bhatiari",
        "postal_code": "4315"
      },
      {
        "name": "Fouzdarhat",
        "postal_code": "4316"
      },
      {
        "name": "Jafrabad",
        "postal_code": "4317"
      },
      {
        "name": "Kumira",
        "postal_code": "4314"
      }
    ]
  },
  "Chuadanga": {
    "Alamdanga": [
      {
        "name": "Hardi",
        "postal_code": "7211"
      }
    ],
    "Chuadanga Sadar": [
      {
        "name": "Doulatganj",
        "postal_code": "7230"
      },
      {
        "name": "Munshiganj",
        "postal_code": "7201"
      }
    ],
    "Damurhuda": [
      {
        "name": "Andulbaria",
        "postal_code": "7222"
      },
      {
        "name": "Darshana",
        "postal_code": "7221"
      }
    ]
  },
  "Cumilla": {
    "Barura": [
      {
        "name": "Murdafarganj",
        "postal_code": "3562"
      },
      {
        "name": "Poyalgachha",
        "postal_code": "3561"
      }
    ],
    "Burichang": [
      {
        "name": "Maynamoti bazar",
        "postal_code": "3521"
      }
    ],
    "Chandina": [
      {
        "name": "Chandia",
        "postal_code": "3510"
      },
      {
        "name": "Madhaiabazar",
        "postal_code": "3511"
      }
    ],
    "Chauddagram": [
      {
        "name": "Batisa",
        "postal_code": "3551"
      },
      {
        "name": "Chiora",
        "postal_code": "3552"
      },
      {
        "name": "Chouddagram",
        "postal_code": "3550"
      }
    ],
    "Cumilla Sadar": [
      {
        "name": "Comilla Contoment",
        "postal_code": "3501"
      },
      {
        "name": "Comilla Sadar",
        "postal_code": "3500"
      },
      {
        "name": "Courtbari",
        "postal_code": "3503"
      },
      {
        "name": "Halimanagar",
        "postal_code": "3502"
      },
      {
        "name": "Suaganj",
        "postal_code": "3504"
      }
    ],
    "Daudkandi": [
      {
        "name": "Dashpara",
        "postal_code": "3518"
      },
      {
        "name": "Eliotganj",
        "postal_code": "3519"
      },
      {
        "name": "Gouripur",
        "postal_code": "3517"
      }
    ],
    "Debidwar": [
      {
        "name": "Barashalghar",
        "postal_code": "3532"
      },
      {
        "name": "Davidhar",
        "postal_code": "3530"
      },
      {
        "name": "Dhamtee",
        "postal_code": "3533"
      },
      {
        "name": "Gangamandal",
        "postal_code": "3531"
      }
    ],
    "Laksam": [
      {
        "name": "Bipulasar",
        "postal_code": "3572"
      },
      {
        "name": "Lakshamanpur",
        "postal_code": "3571"
      }
    ],
    "Muradnagar": [
      {
        "name": "Bangra",
        "postal_code": "3543"
      },
      {
        "name": "Companyganj",
        "postal_code": "3542"
      },
      {
        "name": "Pantibazar",
        "postal_code": "3545"
      },
      {
        "name": "Ramchandarpur",
        "postal_code": "3541"
      },
      {
        "name": "Sonakanda",
        "postal_code": "3544"
      }
    ],
    "Nangalkot": [
      {
        "name": "Chhariabazar",
        "postal_code": "3582"
      },
      {
        "name": "Dhalua",
        "postal_code": "3581"
      },
      {
        "name": "Gunabati",
        "postal_code": "3583"
      },
      {
        "name": "Langalkot",
        "postal_code": "3580"
      }
    ]
  },
  "Dhaka": {
    "Badda": [
      {
        "name": "Khilkhet",
        "postal_code": "1229"
      }
    ],
    "Cantonment": [
      {
        "name": "Dhaka Cantonment",
        "postal_code": "1206"
      }
    ],
    "Demra": [
      {
        "name": "Matuail",
        "postal_code": "1362"
      },
      {
        "name": "Sarulia",
        "postal_code": "1361"
      }
    ],
    "Dhamrai": [
      {
        "name": "Kamalpur",
        "postal_code": "1351"
      }
    ],
    "Dhanmondi": [
      {
        "name": "Jigatala",
        "postal_code": "1209"
      },
      {
        "name": "New Market",
        "postal_code": "1205"
      }
    ],
    "Dohar": [
      {
        "name": "Joypara",
        "postal_code": "1330"
      },
      {
        "name": "Narisha",
        "postal_code": "1332"
      },
      {
        "name": "Palamganj",
        "postal_code": "1331"
      }
    ],
    "Gulshan": [
      {
        "name": "Banani",
        "postal_code": "1213"
      },
      {
        "name": "Gulshan Model Town",
        "postal_code": "1212"
      }
    ],
    "Jatrabari": [
      {
        "name": "Dhania",
        "postal_code": "1232"
      }
    ],
    "Keraniganj": [
      {
        "name": "Ati",
        "postal_code": "1312"
      },
      {
        "name": "Dhaka Jute Mills",
        "postal_code": "1311"
      },
      {
        "name": "Kalatia",
        "postal_code": "1313"
      }
    ],
    "Lalbagh": [
      {
        "name": "Posta",
        "postal_code": "1211"
      }
    ],
    "Mohammadpur": [
      {
        "name": "Mohammadpur Housing",
        "postal_code": "1207"
      },
      {
        "name": "Sangsad Bhaban",
        "postal_code": "1225"
      }
    ],
    "Motijheel": [
      {
        "name": "Bangabhaban",
        "postal_code": "1222"
      },
      {
        "name": "Dhaka",
        "postal_code": "1000"
      },
      {
        "name": "Dilkusha",
        "postal_code": "1223"
      }
    ],
    "Nawabganj": [
      {
        "name": "Agla",
        "postal_code": "1323"
      },
      {
        "name": "Churain",
        "postal_code": "1325"
      },
      {
        "name": "Daudpur",
        "postal_code": "1322"
      },
      {
        "name": "Hasnabad",
        "postal_code": "1321"
      },
      {
        "name": "Khalpar",
        "postal_code": "1324"
      }
    ],
    "Ramna": [
      {
        "name": "Shantinagr",
        "postal_code": "1217"
      }
    ],
    "Sabujbagh": [
      {
        "name": "Basabo",
        "postal_code": "1214"
      }
    ],
    "Savar": [
      {
        "name": "Amin Bazar",
        "postal_code": "1348"
      },
      {
        "name": "Dairy Farm",
        "postal_code": "1341"
      },
      {
        "name": "EPZ",
        "postal_code": "1349"
      },
      {
        "name": "Jahangirnagar Univer",
        "postal_code": "1342"
      },
      {
        "name": "Kashem Cotton Mills",
        "postal_code": "1346"
      },
      {
        "name": "Rajphulbaria",
        "postal_code": "1347"
      },
      {
        "name": "Savar Canttonment",
        "postal_code": "1344"
      },
      {
        "name": "Saver P.A.T.C",
        "postal_code": "1343"
      },
      {
        "name": "Shimulia",
        "postal_code": "1345"
      }
    ],
    "Sutrapur": [
      {
        "name": "Dhaka Sadar",
        "postal_code": "1100"
      },
      {
        "name": "Gendaria",
        "postal_code": "1204"
      },
      {
        "name": "Wari",
        "postal_code": "1203"
      }
    ],
    "Tejgaon": [
      {
        "name": "Dhaka Politechnic",
        "postal_code": "1208"
      }
    ],
    "Uttara": [
      {
        "name": "Uttara Model Twon",
        "postal_code": "1230"
      }
    ]
  },
  "Dinajpur": {
    "Birganj": [
      {
        "name": "Setabganj",
        "postal_code": "5216"
      }
    ],
    "Bochaganj": [
      {
        "name": "Bangla Hili",
        "postal_code": "5270"
      }
    ],
    "Chirirbandar": [
      {
        "name": "Chrirbandar",
        "postal_code": "5240"
      },
      {
        "name": "Ranirbandar",
        "postal_code": "5241"
      }
    ],
    "Dinajpur Sadar": [
      {
        "name": "Dinajpur Rajbari",
        "postal_code": "5201"
      },
      {
        "name": "Maharajganj",
        "postal_code": "5226"
      }
    ],
    "Hakimpur": [
      {
        "name": "Ghoraghat",
        "postal_code": "5291"
      },
      {
        "name": "Osmanpur",
        "postal_code": "5290"
      }
    ],
    "Khansama": [
      {
        "name": "Pakarhat",
        "postal_code": "5231"
      }
    ],
    "Nawabganj": [
      {
        "name": "Daudpur",
        "postal_code": "5281"
      },
      {
        "name": "Gopalpur",
        "postal_code": "5282"
      },
      {
        "name": "Nababganj",
        "postal_code": "5280"
      }
    ]
  },
  "Faridpur": {
    "Boalmari": [
      {
        "name": "Rupatpat",
        "postal_code": "7861"
      }
    ],
    "Charbhadrasan": [
      {
        "name": "Charbadrashan",
        "postal_code": "7810"
      }
    ],
    "Faridpur Sadar": [
      {
        "name": "Ambikapur",
        "postal_code": "7802"
      },
      {
        "name": "Baitulaman Politecni",
        "postal_code": "7803"
      },
      {
        "name": "Kanaipur",
        "postal_code": "7801"
      },
      {
        "name": "Shriangan",
        "postal_code": "7804"
      }
    ],
    "Madhukhali": [
      {
        "name": "Kamarkali",
        "postal_code": "7851"
      },
      {
        "name": "Madukhali",
        "postal_code": "7850"
      }
    ],
    "Nagarkanda": [
      {
        "name": "Talma",
        "postal_code": "7841"
      }
    ],
    "Sadarpur": [
      {
        "name": "Bishwa jaker Manjil",
        "postal_code": "7822"
      },
      {
        "name": "Hat Krishapur",
        "postal_code": "7821"
      }
    ]
  },
  "Feni": {
    "Chhagalnaiya": [
      {
        "name": "Chhagalnaia",
        "postal_code": "3910"
      },
      {
        "name": "Daraga Hat",
        "postal_code": "3912"
      },
      {
        "name": "Maharajganj",
        "postal_code": "3911"
      },
      {
        "name": "Puabashimulia",
        "postal_code": "3913"
      }
    ],
    "Daganbhuiyan": [
      {
        "name": "Chhilonia",
        "postal_code": "3922"
      },
      {
        "name": "Dagondhuia",
        "postal_code": "3920"
      },
      {
        "name": "Dudmukha",
        "postal_code": "3921"
      },
      {
        "name": "Rajapur",
        "postal_code": "3923"
      }
    ],
    "Feni Sadar": [
      {
        "name": "Fazilpur",
        "postal_code": "3901"
      },
      {
        "name": "Laskarhat",
        "postal_code": "3903"
      },
      {
        "name": "Sharshadie",
        "postal_code": "3902"
      }
    ],
    "Parshuram": [
      {
        "name": "Fulgazi",
        "postal_code": "3942"
      },
      {
        "name": "Munshirhat",
        "postal_code": "3943"
      },
      {
        "name": "Pashurampur",
        "postal_code": "3940"
      },
      {
        "name": "Shuarbazar",
        "postal_code": "3941"
      }
    ],
    "Sonagazi": [
      {
        "name": "Ahmadpur",
        "postal_code": "3932"
      },
      {
        "name": "Kazirhat",
        "postal_code": "3933"
      },
      {
        "name": "Motiganj",
        "postal_code": "3931"
      }
    ]
  },
  "Gaibandha": {
    "Fulchhari": [
      {
        "name": "Bharatkhali",
        "postal_code": "5761"
      },
      {
        "name": "Phulchhari",
        "postal_code": "5760"
      }
    ],
    "Gaibandha Sadar": [
      {
        "name": "Bonarpara",
        "postal_code": "5750"
      },
      {
        "name": "saghata",
        "postal_code": "5751"
      }
    ],
    "Gobindaganj": [
      {
        "name": "Gobindhaganj",
        "postal_code": "5740"
      },
      {
        "name": "Mahimaganj",
        "postal_code": "5741"
      }
    ],
    "Sadullapur": [
      {
        "name": "Naldanga",
        "postal_code": "5711"
      },
      {
        "name": "Saadullapur",
        "postal_code": "5710"
      }
    ],
    "Sundarganj": [
      {
        "name": "Bamandanga",
        "postal_code": "5721"
      }
    ]
  },
  "Gazipur": {
    "Gazipur Sadar": [
      {
        "name": "B.O.F",
        "postal_code": "1703"
      },
      {
        "name": "B.R.R",
        "postal_code": "1701"
      },
      {
        "name": "Chandna",
        "postal_code": "1702"
      },
      {
        "name": "Ershad Nagar",
        "postal_code": "1712"
      },
      {
        "name": "Monnunagar",
        "postal_code": "1710"
      },
      {
        "name": "National University",
        "postal_code": "1704"
      },
      {
        "name": "Nishat Nagar",
        "postal_code": "1711"
      }
    ],
    "Kaliakair": [
      {
        "name": "Kaliakaar",
        "postal_code": "1750"
      },
      {
        "name": "Safipur",
        "postal_code": "1751"
      }
    ],
    "Kaliganj": [
      {
        "name": "Pubail",
        "postal_code": "1721"
      },
      {
        "name": "Santanpara",
        "postal_code": "1722"
      },
      {
        "name": "Vaoal Jamalpur",
        "postal_code": "1723"
      }
    ],
    "Kapasia": [
      {
        "name": "kapashia",
        "postal_code": "1730"
      }
    ],
    "Sreepur": [
      {
        "name": "Barmi",
        "postal_code": "1743"
      },
      {
        "name": "Bashamur",
        "postal_code": "1747"
      },
      {
        "name": "Boubi",
        "postal_code": "1748"
      },
      {
        "name": "Kawraid",
        "postal_code": "1745"
      },
      {
        "name": "Rajendrapur",
        "postal_code": "1741"
      },
      {
        "name": "Rajendrapur Canttome",
        "postal_code": "1742"
      },
      {
        "name": "Satkhamair",
        "postal_code": "1744"
      }
    ]
  },
  "Gopalganj": {
    "Gopalganj Sadar": [
      {
        "name": "Barfa",
        "postal_code": "8102"
      },
      {
        "name": "Chandradighalia",
        "postal_code": "8013"
      },
      {
        "name": "Ulpur",
        "postal_code": "8101"
      }
    ],
    "Kashiani": [
      {
        "name": "Jonapur",
        "postal_code": "8133"
      },
      {
        "name": "Ramdia College",
        "postal_code": "8131"
      },
      {
        "name": "Ratoil",
        "postal_code": "8132"
      }
    ],
    "Muksudpur": [
      {
        "name": "Batkiamari",
        "postal_code": "8141"
      },
      {
        "name": "Khandarpara",
        "postal_code": "8142"
      },
      {
        "name": "Maksudpur",
        "postal_code": "8140"
      }
    ],
    "Tungipara": [
      {
        "name": "Patgati",
        "postal_code": "8121"
      }
    ]
  },
  "Habiganj": {
    "Ajmiriganj": [
      {
        "name": "Azmireeganj",
        "postal_code": "3360"
      }
    ],
    "Baniyachong": [
      {
        "name": "Baniachang",
        "postal_code": "3350"
      },
      {
        "name": "Jatrapasha",
        "postal_code": "3351"
      },
      {
        "name": "Kadirganj",
        "postal_code": "3352"
      }
    ],
    "Chunarughat": [
      {
        "name": "Chandpurbagan",
        "postal_code": "3321"
      },
      {
        "name": "Narapati",
        "postal_code": "3322"
      }
    ],
    "Habiganj Sadar": [
      {
        "name": "Gopaya",
        "postal_code": "3302"
      },
      {
        "name": "Hobiganj Sadar",
        "postal_code": "3300"
      },
      {
        "name": "Shaestaganj",
        "postal_code": "3301"
      }
    ],
    "Lakhai": [
      {
        "name": "Kalauk",
        "postal_code": "3340"
      }
    ],
    "Madhabpur": [
      {
        "name": "Itakhola",
        "postal_code": "3331"
      },
      {
        "name": "Saihamnagar",
        "postal_code": "3333"
      },
      {
        "name": "Shahajibazar",
        "postal_code": "3332"
      }
    ],
    "Nabiganj": [
      {
        "name": "Digalbak",
        "postal_code": "3373"
      },
      {
        "name": "Golduba",
        "postal_code": "3372"
      },
      {
        "name": "Goplarbazar",
        "postal_code": "3371"
      },
      {
        "name": "Inathganj",
        "postal_code": "3374"
      }
    ]
  },
  "Jamalpur": {
    "Dewanganj": [
      {
        "name": "Dewangonj",
        "postal_code": "2030"
      },
      {
        "name": "Dewangonj S. Mills",
        "postal_code": "2031"
      }
    ],
    "Islampur": [
      {
        "name": "Durmoot",
        "postal_code": "2021"
      },
      {
        "name": "Gilabari",
        "postal_code": "2022"
      }
    ],
    "Jamalpur Sadar": [
      {
        "name": "Jamalpur",
        "postal_code": "2000"
      },
      {
        "name": "Nandina",
        "postal_code": "2001"
      },
      {
        "name": "Narundi",
        "postal_code": "2002"
      }
    ],
    "Madarganj": [
      {
        "name": "Balijhuri",
        "postal_code": "2041"
      },
      {
        "name": "Mathargonj",
        "postal_code": "2040"
      }
    ],
    "Melandaha": [
      {
        "name": "Jamalpur",
        "postal_code": "2011"
      },
      {
        "name": "Mahmoodpur",
        "postal_code": "2013"
      },
      {
        "name": "Malancha",
        "postal_code": "2012"
      },
      {
        "name": "Malandah",
        "postal_code": "2010"
      }
    ],
    "Sarishabari": [
      {
        "name": "Bausee",
        "postal_code": "2052"
      },
      {
        "name": "Gunerbari",
        "postal_code": "2051"
      },
      {
        "name": "Jagannath Ghat",
        "postal_code": "2053"
      },
      {
        "name": "Jamuna Sar Karkhana",
        "postal_code": "2055"
      },
      {
        "name": "Pingna",
        "postal_code": "2054"
      },
      {
        "name": "Shorishabari",
        "postal_code": "2050"
      }
    ]
  },
  "Jessore": {
    "Abhaynagar": [
      {
        "name": "Bhugilhat",
        "postal_code": "7462"
      },
      {
        "name": "Noapara",
        "postal_code": "7460"
      },
      {
        "name": "Rajghat",
        "postal_code": "7461"
      }
    ],
    "Bagherpara": [
      {
        "name": "Bagharpara",
        "postal_code": "7470"
      },
      {
        "name": "Gouranagar",
        "postal_code": "7471"
      }
    ],
    "Chaugachha": [
      {
        "name": "Chougachha",
        "postal_code": "7410"
      }
    ],
    "Jessore Sadar": [
      {
        "name": "Basundia",
        "postal_code": "7406"
      },
      {
        "name": "Chanchra",
        "postal_code": "7402"
      },
      {
        "name": "Churamankathi",
        "postal_code": "7407"
      },
      {
        "name": "Jessore Airbach",
        "postal_code": "7404"
      },
      {
        "name": "Jessore canttonment",
        "postal_code": "7403"
      },
      {
        "name": "Jessore Upa-Shahar",
        "postal_code": "7401"
      },
      {
        "name": "Rupdia",
        "postal_code": "7405"
      }
    ],
    "Keshabpur": [
      {
        "name": "Keshobpur",
        "postal_code": "7450"
      }
    ],
    "Manirampur": [
      {
        "name": "Monirampur",
        "postal_code": "7440"
      }
    ],
    "Sharsha": [
      {
        "name": "Bag Achra",
        "postal_code": "7433"
      },
      {
        "name": "Benapole",
        "postal_code": "7431"
      },
      {
        "name": "Jadabpur",
        "postal_code": "7432"
      },
      {
        "name": "Sarsa",
        "postal_code": "7430"
      }
    ]
  },
  "Jhalokathi": {
    "Jhalokathi Sadar": [
      {
        "name": "Baukathi",
        "postal_code": "8402"
      },
      {
        "name": "Gabha",
        "postal_code": "8403"
      },
      {
        "name": "Nabagram",
        "postal_code": "8401"
      },
      {
        "name": "Shekherhat",
        "postal_code": "8404"
      }
    ],
    "Kathalia": [
      {
        "name": "Amua",
        "postal_code": "8431"
      },
      {
        "name": "Niamatee",
        "postal_code": "8432"
      },
      {
        "name": "Shoulajalia",
        "postal_code": "8433"
      }
    ],
    "Nalchity": [
      {
        "name": "Beerkathi",
        "postal_code": "8421"
      },
      {
        "name": "Nalchhiti",
        "postal_code": "8420"
      }
    ]
  },
  "Jhenaidah": {
    "Harinakunda": [
      {
        "name": "Harinakundu",
        "postal_code": "7310"
      }
    ],
    "Jhenaidah Sadar": [
      {
        "name": "Hatbar Bazar",
        "postal_code": "7351"
      },
      {
        "name": "Jinaidaha Cadet College",
        "postal_code": "7301"
      },
      {
        "name": "Jinaidaha Sadar",
        "postal_code": "7300"
      },
      {
        "name": "Naldanga",
        "postal_code": "7350"
      }
    ],
    "Shailkupa": [
      {
        "name": "Kumiradaha",
        "postal_code": "7321"
      },
      {
        "name": "Shailakupa",
        "postal_code": "7320"
      }
    ]
  },
  "Joypurhat": {
    "Akkelpur": [
      {
        "name": "Akklepur",
        "postal_code": "5940"
      },
      {
        "name": "jamalganj",
        "postal_code": "5941"
      },
      {
        "name": "Tilakpur",
        "postal_code": "5942"
      }
    ]
  },
  "Khagrachari": {
    "Dighinala": [
      {
        "name": "Diginala",
        "postal_code": "4420"
      }
    ],
    "Panchari": [
      {
        "name": "Panchhari",
        "postal_code": "4410"
      }
    ],
    "Ramgarh": [
      {
        "name": "Ramghar Head Office",
        "postal_code": "4440"
      }
    ]
  },
  "Khulna": {
    "Batiaghata": [
      {
        "name": "Alaipur",
        "postal_code": "9240"
      },
      {
        "name": "Batiaghat",
        "postal_code": "9260"
      },
      {
        "name": "Belphulia",
        "postal_code": "9242"
      },
      {
        "name": "Rupsha",
        "postal_code": "9241"
      },
      {
        "name": "Surkalee",
        "postal_code": "9261"
      }
    ],
    "Dacope": [
      {
        "name": "Bajua",
        "postal_code": "9272"
      },
      {
        "name": "Chalna Bazar",
        "postal_code": "9270"
      },
      {
        "name": "Dakup",
        "postal_code": "9271"
      },
      {
        "name": "Nalian",
        "postal_code": "9273"
      }
    ],
    "Daulatpur": [
      {
        "name": "Indranarayanpur",
        "postal_code": "8350"
      },
      {
        "name": "Kamarhat",
        "postal_code": "8720"
      }
    ],
    "Dumuria": [
      {
        "name": "Chandni Mahal",
        "postal_code": "9221"
      },
      {
        "name": "Chuknagar",
        "postal_code": "9252"
      },
      {
        "name": "Digalia",
        "postal_code": "9220"
      },
      {
        "name": "Gazirhat",
        "postal_code": "9224"
      },
      {
        "name": "Ghonabanda",
        "postal_code": "9251"
      },
      {
        "name": "Ghoshghati",
        "postal_code": "9223"
      },
      {
        "name": "Sajiara",
        "postal_code": "9250"
      },
      {
        "name": "Senhati",
        "postal_code": "9222"
      },
      {
        "name": "Shahapur",
        "postal_code": "9253"
      }
    ],
    "Kotwali": [
      {
        "name": "Atra Shilpa Area",
        "postal_code": "9207"
      },
      {
        "name": "BIT Khulna",
        "postal_code": "9203"
      },
      {
        "name": "Doulatpur",
        "postal_code": "9202"
      },
      {
        "name": "Jahanabad Canttonmen",
        "postal_code": "9205"
      },
      {
        "name": "Khula Sadar",
        "postal_code": "9100"
      },
      {
        "name": "Khulna G.P.O",
        "postal_code": "9000"
      },
      {
        "name": "Khulna Shipyard",
        "postal_code": "9201"
      },
      {
        "name": "Khulna University",
        "postal_code": "9208"
      },
      {
        "name": "Siramani",
        "postal_code": "9204"
      },
      {
        "name": "Sonali Jute Mills",
        "postal_code": "9206"
      }
    ],
    "Paikgachha": [
      {
        "name": "Amadee",
        "postal_code": "9291"
      },
      {
        "name": "Chandkhali",
        "postal_code": "9284"
      },
      {
        "name": "Garaikhali",
        "postal_code": "9285"
      },
      {
        "name": "Godaipur",
        "postal_code": "9281"
      },
      {
        "name": "Kapilmoni",
        "postal_code": "9282"
      },
      {
        "name": "Katipara",
        "postal_code": "9283"
      },
      {
        "name": "Madinabad",
        "postal_code": "9290"
      }
    ],
    "Terokhada": [
      {
        "name": "Pak Barasat",
        "postal_code": "9231"
      },
      {
        "name": "Terakhada",
        "postal_code": "9230"
      }
    ]
  },
  "Kishoreganj": {
    "Austagram": [
      {
        "name": "Ostagram",
        "postal_code": "2380"
      }
    ],
    "Bajitpur": [
      {
        "name": "Laksmipur",
        "postal_code": "2338"
      },
      {
        "name": "Sararchar",
        "postal_code": "2337"
      }
    ],
    "Hossainpur": [
      {
        "name": "Hossenpur",
        "postal_code": "2320"
      }
    ],
    "Katiadi": [
      {
        "name": "Gochhihata",
        "postal_code": "2331"
      }
    ],
    "Kishoreganj Sadar": [
      {
        "name": "Kishoreganj S.Mills",
        "postal_code": "2301"
      },
      {
        "name": "Maizhati",
        "postal_code": "2302"
      },
      {
        "name": "Nilganj",
        "postal_code": "2303"
      }
    ],
    "Kuliarchar": [
      {
        "name": "Chhoysuti",
        "postal_code": "2341"
      }
    ],
    "Mithamain": [
      {
        "name": "Abdullahpur",
        "postal_code": "2371"
      },
      {
        "name": "MIthamoin",
        "postal_code": "2370"
      }
    ],
    "Tarail": [
      {
        "name": "Tarial",
        "postal_code": "2316"
      }
    ]
  },
  "Kurigram": {
    "Char Rajibpur": [
      {
        "name": "Rajibpur",
        "postal_code": "5650"
      }
    ],
    "Chilmari": [
      {
        "name": "Jorgachh",
        "postal_code": "5631"
      }
    ],
    "Kurigram Sadar": [
      {
        "name": "Pandul",
        "postal_code": "5601"
      },
      {
        "name": "Phulbari",
        "postal_code": "5680"
      }
    ],
    "Nageshwari": [
      {
        "name": "Nageshwar",
        "postal_code": "5660"
      }
    ],
    "Rajarhat": [
      {
        "name": "Nazimkhan",
        "postal_code": "5611"
      }
    ],
    "Raomari": [
      {
        "name": "Roumari",
        "postal_code": "5640"
      }
    ],
    "Ulipur": [
      {
        "name": "Bazarhat",
        "postal_code": "5621"
      }
    ]
  },
  "Kushtia": {
    "Bheramara": [
      {
        "name": "Allardarga",
        "postal_code": "7042"
      },
      {
        "name": "Ganges Bheramara",
        "postal_code": "7041"
      }
    ],
    "Kumarkhali": [
      {
        "name": "Panti",
        "postal_code": "7011"
      }
    ],
    "Kushtia Sadar": [
      {
        "name": "Islami University",
        "postal_code": "7003"
      },
      {
        "name": "Jagati",
        "postal_code": "7002"
      },
      {
        "name": "Janipur",
        "postal_code": "7020"
      },
      {
        "name": "Khasmathurapur",
        "postal_code": "7052"
      },
      {
        "name": "Khoksa",
        "postal_code": "7021"
      },
      {
        "name": "Kushtia Mohini",
        "postal_code": "7001"
      },
      {
        "name": "Kustia Sadar",
        "postal_code": "7000"
      },
      {
        "name": "Rafayetpur",
        "postal_code": "7050"
      },
      {
        "name": "Taragunia",
        "postal_code": "7051"
      }
    ],
    "Mirpur": [
      {
        "name": "Amla Sadarpur",
        "postal_code": "7032"
      },
      {
        "name": "Poradaha",
        "postal_code": "7031"
      }
    ]
  },
  "Lakshmipur": {
    "Kamalnagar": [
      {
        "name": "Char Alexgander",
        "postal_code": "3730"
      },
      {
        "name": "Hajirghat",
        "postal_code": "3731"
      },
      {
        "name": "Ramgatirhat",
        "postal_code": "3732"
      }
    ],
    "Lakshmipur Sadar": [
      {
        "name": "Amani Lakshimpur",
        "postal_code": "3709"
      },
      {
        "name": "Bhabaniganj",
        "postal_code": "3702"
      },
      {
        "name": "Chandraganj",
        "postal_code": "3708"
      },
      {
        "name": "Choupalli",
        "postal_code": "3707"
      },
      {
        "name": "Dalal Bazar",
        "postal_code": "3701"
      },
      {
        "name": "Duttapara",
        "postal_code": "3706"
      },
      {
        "name": "Keramatganj",
        "postal_code": "3704"
      },
      {
        "name": "Lakshimpur Sadar",
        "postal_code": "3700"
      },
      {
        "name": "Mandari",
        "postal_code": "3703"
      },
      {
        "name": "Rupchara",
        "postal_code": "3705"
      }
    ],
    "Raipur": [
      {
        "name": "Bhuabari",
        "postal_code": "3714"
      },
      {
        "name": "Haydarganj",
        "postal_code": "3713"
      },
      {
        "name": "Nagerdighirpar",
        "postal_code": "3712"
      },
      {
        "name": "Rakhallia",
        "postal_code": "3711"
      },
      {
        "name": "Raypur",
        "postal_code": "3710"
      }
    ],
    "Ramganj": [
      {
        "name": "Alipur",
        "postal_code": "3721"
      },
      {
        "name": "Dolta",
        "postal_code": "3725"
      },
      {
        "name": "Kanchanpur",
        "postal_code": "3723"
      },
      {
        "name": "Naagmud",
        "postal_code": "3724"
      },
      {
        "name": "Panpara",
        "postal_code": "3722"
      }
    ]
  },
  "Lalmonirhat": {
    "Lalmonirhat Sadar": [
      {
        "name": "Kulaghat SO",
        "postal_code": "5502"
      },
      {
        "name": "Moghalhat",
        "postal_code": "5501"
      },
      {
        "name": "Tushbhandar",
        "postal_code": "5520"
      }
    ],
    "Patgram": [
      {
        "name": "Baura",
        "postal_code": "5541"
      },
      {
        "name": "Burimari",
        "postal_code": "5542"
      }
    ]
  },
  "Madaripur": {
    "Kalkini": [
      {
        "name": "Sahabrampur",
        "postal_code": "7921"
      }
    ],
    "Madaripur Sadar": [
      {
        "name": "Bahadurpur",
        "postal_code": "7932"
      },
      {
        "name": "Barhamganj",
        "postal_code": "7930"
      },
      {
        "name": "Charmugria",
        "postal_code": "7901"
      },
      {
        "name": "Habiganj",
        "postal_code": "7903"
      },
      {
        "name": "Kulpaddi",
        "postal_code": "7902"
      },
      {
        "name": "Mustafapur",
        "postal_code": "7904"
      },
      {
        "name": "Nilaksmibandar",
        "postal_code": "7931"
      },
      {
        "name": "Umedpur",
        "postal_code": "7933"
      }
    ],
    "Rajoir": [
      {
        "name": "Khalia",
        "postal_code": "7911"
      }
    ]
  },
  "Magura": {
    "Magura Sadar": [
      {
        "name": "Arpara",
        "postal_code": "7620"
      }
    ],
    "Mohammadpur": [
      {
        "name": "Binodpur",
        "postal_code": "7631"
      },
      {
        "name": "Nahata",
        "postal_code": "7632"
      }
    ],
    "Sreepur": [
      {
        "name": "Langalbadh",
        "postal_code": "7611"
      },
      {
        "name": "Nachol",
        "postal_code": "7612"
      },
      {
        "name": "Shripur",
        "postal_code": "7610"
      }
    ]
  },
  "Manikganj": {
    "Daulatpur": [
      {
        "name": "Doulatpur",
        "postal_code": "1860"
      }
    ],
    "Ghior": [
      {
        "name": "Gheor",
        "postal_code": "1840"
      }
    ],
    "Manikganj Sadar": [
      {
        "name": "Barangail",
        "postal_code": "1804"
      },
      {
        "name": "Gorpara",
        "postal_code": "1802"
      },
      {
        "name": "Jhitka",
        "postal_code": "1831"
      },
      {
        "name": "Lechhraganj",
        "postal_code": "1830"
      },
      {
        "name": "Mahadebpur",
        "postal_code": "1803"
      },
      {
        "name": "Manikganj Bazar",
        "postal_code": "1801"
      }
    ],
    "Saturia": [
      {
        "name": "Baliati",
        "postal_code": "1811"
      }
    ],
    "Shibalaya": [
      {
        "name": "Aricha",
        "postal_code": "1851"
      },
      {
        "name": "Shibaloy",
        "postal_code": "1850"
      },
      {
        "name": "Tewta",
        "postal_code": "1852"
      },
      {
        "name": "Uthli",
        "postal_code": "1853"
      }
    ],
    "Singair": [
      {
        "name": "Baira",
        "postal_code": "1821"
      },
      {
        "name": "joymantop",
        "postal_code": "1822"
      }
    ]
  },
  "Meherpur": {
    "Meherpur Sadar": [
      {
        "name": "Amjhupi",
        "postal_code": "7101"
      },
      {
        "name": "Mujib Nagar Complex",
        "postal_code": "7102"
      }
    ]
  },
  "Moulvibazar": {
    "Barlekha": [
      {
        "name": "Baralekha",
        "postal_code": "3250"
      },
      {
        "name": "Dhakkhinbag",
        "postal_code": "3252"
      },
      {
        "name": "Juri",
        "postal_code": "3251"
      },
      {
        "name": "Purbashahabajpur",
        "postal_code": "3253"
      }
    ],
    "Kamalganj": [
      {
        "name": "Keramatnaga",
        "postal_code": "3221"
      },
      {
        "name": "Munshibazar",
        "postal_code": "3224"
      },
      {
        "name": "Patrakhola",
        "postal_code": "3222"
      },
      {
        "name": "Shamsher Nagar",
        "postal_code": "3223"
      }
    ],
    "Kulaura": [
      {
        "name": "Baramchal",
        "postal_code": "3237"
      },
      {
        "name": "Kajaldhara",
        "postal_code": "3234"
      },
      {
        "name": "Karimpur",
        "postal_code": "3235"
      },
      {
        "name": "Langla",
        "postal_code": "3232"
      },
      {
        "name": "Prithimpasha",
        "postal_code": "3233"
      },
      {
        "name": "Tillagaon",
        "postal_code": "3231"
      }
    ],
    "Moulvibazar Sadar": [
      {
        "name": "Afrozganj",
        "postal_code": "3203"
      },
      {
        "name": "Barakapan",
        "postal_code": "3201"
      },
      {
        "name": "Monumukh",
        "postal_code": "3202"
      }
    ],
    "Sreemangal": [
      {
        "name": "Kalighat",
        "postal_code": "3212"
      },
      {
        "name": "Khejurichhara",
        "postal_code": "3213"
      },
      {
        "name": "Narain Chora",
        "postal_code": "3211"
      },
      {
        "name": "Satgaon",
        "postal_code": "3214"
      },
      {
        "name": "Srimangal",
        "postal_code": "3210"
      }
    ]
  },
  "Munshiganj": {
    "Gajaria": [
      {
        "name": "Hossendi",
        "postal_code": "1511"
      },
      {
        "name": "Rasulpur",
        "postal_code": "1512"
      }
    ],
    "Louhajang": [
      {
        "name": "Gouragonj",
        "postal_code": "1334"
      },
      {
        "name": "Haldia SO",
        "postal_code": "1532"
      },
      {
        "name": "Haridia",
        "postal_code": "1333"
      },
      {
        "name": "Haridia DESO",
        "postal_code": "1533"
      },
      {
        "name": "Korhati",
        "postal_code": "1531"
      },
      {
        "name": "Lohajang",
        "postal_code": "1530"
      },
      {
        "name": "Madini Mandal",
        "postal_code": "1335"
      },
      {
        "name": "Medini Mandal EDSO",
        "postal_code": "1535"
      }
    ],
    "Munshiganj Sadar": [
      {
        "name": "Kathakhali",
        "postal_code": "1503"
      },
      {
        "name": "Mirkadim",
        "postal_code": "1502"
      },
      {
        "name": "Rikabibazar",
        "postal_code": "1501"
      }
    ],
    "Sirajdikhan": [
      {
        "name": "Ichapur",
        "postal_code": "1542"
      },
      {
        "name": "Kola",
        "postal_code": "1541"
      },
      {
        "name": "Malkha Nagar",
        "postal_code": "1543"
      },
      {
        "name": "Shekher Nagar",
        "postal_code": "1544"
      }
    ],
    "Sreenagar": [
      {
        "name": "Baghra",
        "postal_code": "1557"
      },
      {
        "name": "Barikhal",
        "postal_code": "1551"
      },
      {
        "name": "Bhaggyakul",
        "postal_code": "1558"
      },
      {
        "name": "Hashara",
        "postal_code": "1553"
      },
      {
        "name": "Kolapara",
        "postal_code": "1554"
      },
      {
        "name": "Kumarbhog",
        "postal_code": "1555"
      },
      {
        "name": "Mazpara",
        "postal_code": "1552"
      },
      {
        "name": "Srinagar",
        "postal_code": "1550"
      },
      {
        "name": "Vaggyakul SO",
        "postal_code": "1556"
      }
    ],
    "Tongibari": [
      {
        "name": "Bajrajugini",
        "postal_code": "1523"
      },
      {
        "name": "Baligao",
        "postal_code": "1522"
      },
      {
        "name": "Betkahat",
        "postal_code": "1521"
      },
      {
        "name": "Dighirpar",
        "postal_code": "1525"
      },
      {
        "name": "Hasail",
        "postal_code": "1524"
      },
      {
        "name": "Pura",
        "postal_code": "1527"
      },
      {
        "name": "Pura EDSO",
        "postal_code": "1526"
      },
      {
        "name": "Tangibari",
        "postal_code": "1520"
      }
    ]
  },
  "Mymensingh": {
    "Gaffargaon": [
      {
        "name": "Duttarbazar",
        "postal_code": "2234"
      },
      {
        "name": "Gaforgaon",
        "postal_code": "2230"
      },
      {
        "name": "Kandipara",
        "postal_code": "2233"
      },
      {
        "name": "Shibganj",
        "postal_code": "2231"
      },
      {
        "name": "Usti",
        "postal_code": "2232"
      }
    ],
    "Gauripur": [
      {
        "name": "Gouripur",
        "postal_code": "2270"
      },
      {
        "name": "Ramgopalpur",
        "postal_code": "2271"
      }
    ],
    "Haluaghat": [
      {
        "name": "Dhara",
        "postal_code": "2261"
      },
      {
        "name": "Munshirhat",
        "postal_code": "2262"
      }
    ],
    "Ishwarganj": [
      {
        "name": "Atharabari",
        "postal_code": "2282"
      },
      {
        "name": "Isshwargonj",
        "postal_code": "2280"
      },
      {
        "name": "Sohagi",
        "postal_code": "2281"
      }
    ],
    "Mymensingh Sadar": [
      {
        "name": "Agriculture Universi",
        "postal_code": "2202"
      },
      {
        "name": "Biddyaganj",
        "postal_code": "2204"
      },
      {
        "name": "Kawatkhali",
        "postal_code": "2201"
      },
      {
        "name": "Pearpur",
        "postal_code": "2205"
      },
      {
        "name": "Shombhuganj",
        "postal_code": "2203"
      }
    ],
    "Nandail": [
      {
        "name": "Gangail",
        "postal_code": "2291"
      }
    ],
    "Phulpur": [
      {
        "name": "Beltia",
        "postal_code": "2251"
      },
      {
        "name": "Tarakanda",
        "postal_code": "2252"
      }
    ],
    "Trishal": [
      {
        "name": "Ahmadbad",
        "postal_code": "2221"
      },
      {
        "name": "Dhala",
        "postal_code": "2223"
      },
      {
        "name": "Ram Amritaganj",
        "postal_code": "2222"
      }
    ]
  },
  "Naogaon": {
    "Dhamoirhat": [
      {
        "name": "Dhamuirhat",
        "postal_code": "6580"
      }
    ],
    "Mohadevpur": [
      {
        "name": "Mahadebpur",
        "postal_code": "6530"
      }
    ],
    "Naogaon Sadar": [
      {
        "name": "Ahsanganj",
        "postal_code": "6596"
      },
      {
        "name": "Bandai",
        "postal_code": "6597"
      }
    ],
    "Niamatpur": [
      {
        "name": "Nitpur",
        "postal_code": "6550"
      },
      {
        "name": "Panguria",
        "postal_code": "6552"
      },
      {
        "name": "Porsa",
        "postal_code": "6551"
      }
    ],
    "Patnitala": [
      {
        "name": "Balihar",
        "postal_code": "6512"
      },
      {
        "name": "Manda",
        "postal_code": "6511"
      },
      {
        "name": "Prasadpur",
        "postal_code": "6510"
      }
    ],
    "Raninagar": [
      {
        "name": "Kashimpur",
        "postal_code": "6591"
      }
    ],
    "Sapahar": [
      {
        "name": "Moduhil",
        "postal_code": "6561"
      }
    ]
  },
  "Narail": {
    "Narail Sadar": [
      {
        "name": "Baradia",
        "postal_code": "7514"
      },
      {
        "name": "Itna",
        "postal_code": "7512"
      },
      {
        "name": "Laxmipasha",
        "postal_code": "7510"
      },
      {
        "name": "Lohagora",
        "postal_code": "7511"
      },
      {
        "name": "Mohajan",
        "postal_code": "7521"
      },
      {
        "name": "Naldi",
        "postal_code": "7513"
      },
      {
        "name": "Ratanganj",
        "postal_code": "7501"
      }
    ]
  },
  "Narayanganj": {
    "Araihazar": [
      {
        "name": "Gopaldi",
        "postal_code": "1451"
      }
    ],
    "Bandar": [
      {
        "name": "BIDS",
        "postal_code": "1413"
      },
      {
        "name": "D.C Mills",
        "postal_code": "1411"
      },
      {
        "name": "Madanganj",
        "postal_code": "1414"
      },
      {
        "name": "Nabiganj",
        "postal_code": "1412"
      }
    ],
    "Narayanganj Sadar": [
      {
        "name": "Baidder Bazar",
        "postal_code": "1440"
      },
      {
        "name": "Bara Nagar",
        "postal_code": "1441"
      },
      {
        "name": "Barodi",
        "postal_code": "1442"
      },
      {
        "name": "Fatulla Bazar",
        "postal_code": "1421"
      },
      {
        "name": "Fatullah",
        "postal_code": "1420"
      }
    ],
    "Rupganj": [
      {
        "name": "Bhulta",
        "postal_code": "1462"
      },
      {
        "name": "Kanchan",
        "postal_code": "1461"
      },
      {
        "name": "Murapara",
        "postal_code": "1464"
      },
      {
        "name": "Nagri",
        "postal_code": "1463"
      }
    ],
    "Siddhirganj": [
      {
        "name": "Adamjeenagar",
        "postal_code": "1431"
      },
      {
        "name": "LN Mills",
        "postal_code": "1432"
      },
      {
        "name": "Siddirganj",
        "postal_code": "1430"
      }
    ]
  },
  "Narsingdi": {
    "Monohardi": [
      {
        "name": "Hatirdia",
        "postal_code": "1651"
      },
      {
        "name": "Katabaria",
        "postal_code": "1652"
      },
      {
        "name": "Monohordi",
        "postal_code": "1650"
      }
    ],
    "Narsingdi Sadar": [
      {
        "name": "Karimpur",
        "postal_code": "1605"
      },
      {
        "name": "Madhabdi",
        "postal_code": "1604"
      },
      {
        "name": "Narshingdi College",
        "postal_code": "1602"
      },
      {
        "name": "Narshingdi Sadar",
        "postal_code": "1600"
      },
      {
        "name": "Panchdona",
        "postal_code": "1603"
      },
      {
        "name": "UMC Jute Mills",
        "postal_code": "1601"
      }
    ],
    "Palash": [
      {
        "name": "Char Sindhur",
        "postal_code": "1612"
      },
      {
        "name": "Ghorashal",
        "postal_code": "1613"
      },
      {
        "name": "Ghorashal Urea Facto",
        "postal_code": "1611"
      }
    ],
    "Raipura": [
      {
        "name": "Bazar Hasnabad",
        "postal_code": "1631"
      },
      {
        "name": "Radhaganj bazar",
        "postal_code": "1632"
      },
      {
        "name": "Raypura",
        "postal_code": "1630"
      }
    ]
  },
  "Natore": {
    "Gurudaspur": [
      {
        "name": "Abdulpur",
        "postal_code": "6422"
      },
      {
        "name": "Gopalpur U.P.O",
        "postal_code": "6420"
      },
      {
        "name": "Hatgurudaspur",
        "postal_code": "6440"
      },
      {
        "name": "Lalpur S.O",
        "postal_code": "6421"
      }
    ],
    "Lalpur": [
      {
        "name": "Laxman",
        "postal_code": "6410"
      }
    ],
    "Natore Sadar": [
      {
        "name": "Baiddyabal Gharia",
        "postal_code": "6402"
      },
      {
        "name": "Baraigram",
        "postal_code": "6432"
      },
      {
        "name": "Dayarampur",
        "postal_code": "6431"
      },
      {
        "name": "Digapatia",
        "postal_code": "6401"
      },
      {
        "name": "Harua",
        "postal_code": "6430"
      },
      {
        "name": "Madhnagar",
        "postal_code": "6403"
      }
    ]
  },
  "Netrokona": {
    "Durgapur": [
      {
        "name": "Susnng Durgapur",
        "postal_code": "2420"
      }
    ],
    "Khaliajuri": [
      {
        "name": "Khaliajhri",
        "postal_code": "2460"
      },
      {
        "name": "Shaldigha",
        "postal_code": "2462"
      }
    ],
    "Mohanganj": [
      {
        "name": "Moddoynagar",
        "postal_code": "2456"
      }
    ],
    "Netrokona Sadar": [
      {
        "name": "Baikherhati",
        "postal_code": "2401"
      },
      {
        "name": "Dharampasha",
        "postal_code": "2450"
      },
      {
        "name": "Dhobaura",
        "postal_code": "2416"
      },
      {
        "name": "Netrakona Sadar",
        "postal_code": "2400"
      },
      {
        "name": "Sakoai",
        "postal_code": "2417"
      }
    ],
    "Purbadhala": [
      {
        "name": "Jaria Jhanjhail",
        "postal_code": "2412"
      },
      {
        "name": "Purbadhola",
        "postal_code": "2410"
      },
      {
        "name": "Shamgonj",
        "postal_code": "2411"
      }
    ]
  },
  "Nilphamari": {
    "Dimla": [
      {
        "name": "Ghaga Kharibari",
        "postal_code": "5351"
      }
    ],
    "Domar": [
      {
        "name": "Chilahati",
        "postal_code": "5341"
      }
    ],
    "Kishoreganj": [
      {
        "name": "Kishoriganj",
        "postal_code": "5320"
      }
    ],
    "Nilphamari Sadar": [
      {
        "name": "Nilphamari Sugar Mil",
        "postal_code": "5301"
      }
    ],
    "Saidpur": [
      {
        "name": "Syedpur",
        "postal_code": "5310"
      },
      {
        "name": "Syedpur Upashahar",
        "postal_code": "5311"
      }
    ]
  },
  "Noakhali": {
    "Begumganj": [
      {
        "name": "Alaiarpur",
        "postal_code": "3831"
      },
      {
        "name": "Amisha Para",
        "postal_code": "3847"
      },
      {
        "name": "Banglabazar",
        "postal_code": "3822"
      },
      {
        "name": "Bazra",
        "postal_code": "3824"
      },
      {
        "name": "Bhabani Jibanpur",
        "postal_code": "3837"
      },
      {
        "name": "Choumohani",
        "postal_code": "3821"
      },
      {
        "name": "Dauti",
        "postal_code": "3843"
      },
      {
        "name": "Durgapur",
        "postal_code": "3848"
      },
      {
        "name": "Gopalpur",
        "postal_code": "3828"
      },
      {
        "name": "Jamidar Hat",
        "postal_code": "3825"
      },
      {
        "name": "Joyag",
        "postal_code": "3844"
      },
      {
        "name": "Joynarayanpur",
        "postal_code": "3829"
      },
      {
        "name": "Khalafat Bazar",
        "postal_code": "3833"
      },
      {
        "name": "Khalishpur",
        "postal_code": "3842"
      },
      {
        "name": "Maheshganj",
        "postal_code": "3838"
      },
      {
        "name": "Mir Owarishpur",
        "postal_code": "3823"
      },
      {
        "name": "Nadona",
        "postal_code": "3839"
      },
      {
        "name": "Nandiapara",
        "postal_code": "3841"
      },
      {
        "name": "Oachhekpur",
        "postal_code": "3835"
      },
      {
        "name": "Rajganj",
        "postal_code": "3834"
      },
      {
        "name": "Sonaimuri",
        "postal_code": "3827"
      },
      {
        "name": "Tangirpar",
        "postal_code": "3832"
      },
      {
        "name": "Thanar Hat",
        "postal_code": "3845"
      }
    ],
    "Chatkhil": [
      {
        "name": "Bansa Bazar",
        "postal_code": "3879"
      },
      {
        "name": "Bodalcourt",
        "postal_code": "3873"
      },
      {
        "name": "Dosh Gharia",
        "postal_code": "3878"
      },
      {
        "name": "Karihati",
        "postal_code": "3877"
      },
      {
        "name": "Khilpara",
        "postal_code": "3872"
      },
      {
        "name": "Palla",
        "postal_code": "3871"
      },
      {
        "name": "Rezzakpur",
        "postal_code": "3874"
      },
      {
        "name": "Sahapur",
        "postal_code": "3881"
      },
      {
        "name": "Sampara",
        "postal_code": "3882"
      },
      {
        "name": "Shingbahura",
        "postal_code": "3883"
      },
      {
        "name": "Solla",
        "postal_code": "3875"
      }
    ],
    "Hatiya": [
      {
        "name": "Afazia",
        "postal_code": "3891"
      },
      {
        "name": "Tamoraddi",
        "postal_code": "3892"
      }
    ],
    "Kabirhat": [
      {
        "name": "Basur Hat",
        "postal_code": "3850"
      },
      {
        "name": "Charhajari",
        "postal_code": "3851"
      }
    ],
    "Noakhali Sadar": [
      {
        "name": "Chaprashir Hat",
        "postal_code": "3811"
      },
      {
        "name": "Char Jabbar",
        "postal_code": "3812"
      },
      {
        "name": "Charam Tua",
        "postal_code": "3809"
      },
      {
        "name": "Din Monir Hat",
        "postal_code": "3803"
      },
      {
        "name": "Kabirhat",
        "postal_code": "3807"
      },
      {
        "name": "Khalifar Hat",
        "postal_code": "3808"
      },
      {
        "name": "Mriddarhat",
        "postal_code": "3806"
      },
      {
        "name": "Noakhali College",
        "postal_code": "3801"
      },
      {
        "name": "Pak Kishoreganj",
        "postal_code": "3804"
      },
      {
        "name": "Sonapur",
        "postal_code": "3802"
      }
    ],
    "Senbagh": [
      {
        "name": "Beezbag",
        "postal_code": "3862"
      },
      {
        "name": "Chatarpaia",
        "postal_code": "3864"
      },
      {
        "name": "Kallyandi",
        "postal_code": "3861"
      },
      {
        "name": "Kankirhat",
        "postal_code": "3863"
      },
      {
        "name": "Senbag",
        "postal_code": "3860"
      },
      {
        "name": "T.P. Lamua",
        "postal_code": "3865"
      }
    ]
  },
  "Pabna": {
    "Bera": [
      {
        "name": "Kashinathpur",
        "postal_code": "6682"
      },
      {
        "name": "Nakalia",
        "postal_code": "6681"
      },
      {
        "name": "Puran Bharenga",
        "postal_code": "6683"
      }
    ],
    "Ishwardi": [
      {
        "name": "Dhapari",
        "postal_code": "6621"
      },
      {
        "name": "Pakshi",
        "postal_code": "6622"
      },
      {
        "name": "Rajapur",
        "postal_code": "6623"
      }
    ],
    "Pabna Sadar": [
      {
        "name": "Banwarinagar",
        "postal_code": "6650"
      },
      {
        "name": "Debottar",
        "postal_code": "6610"
      },
      {
        "name": "Hamayetpur",
        "postal_code": "6602"
      },
      {
        "name": "Kaliko Cotton Mills",
        "postal_code": "6601"
      }
    ],
    "Santhia": [
      {
        "name": "Sathia",
        "postal_code": "6670"
      }
    ],
    "Sujanagar": [
      {
        "name": "Sagarkandi",
        "postal_code": "6661"
      }
    ]
  },
  "Panchagarh": {
    "Debiganj": [
      {
        "name": "Dabiganj",
        "postal_code": "5020"
      }
    ],
    "Panchagarh Sadar": [
      {
        "name": "Chotto Dab",
        "postal_code": "5040"
      },
      {
        "name": "Mirjapur",
        "postal_code": "5041"
      },
      {
        "name": "Panchagar Sadar",
        "postal_code": "5000"
      }
    ]
  },
  "Patuakhali": {
    "Bauphal": [
      {
        "name": "Bagabandar",
        "postal_code": "8621"
      },
      {
        "name": "Birpasha",
        "postal_code": "8622"
      },
      {
        "name": "Kalaia",
        "postal_code": "8624"
      },
      {
        "name": "Kalishari",
        "postal_code": "8623"
      }
    ],
    "Galachipa": [
      {
        "name": "Gazipur Bandar",
        "postal_code": "8641"
      }
    ],
    "Kalapara": [
      {
        "name": "Khepupara",
        "postal_code": "8650"
      },
      {
        "name": "Mahipur",
        "postal_code": "8651"
      }
    ],
    "Patuakhali Sadar": [
      {
        "name": "Dumkee",
        "postal_code": "8602"
      },
      {
        "name": "Moukaran",
        "postal_code": "8601"
      },
      {
        "name": "Rahimabad",
        "postal_code": "8603"
      },
      {
        "name": "Subidkhali",
        "postal_code": "8610"
      }
    ]
  },
  "Pirojpur": {
    "Bhandaria": [
      {
        "name": "Dhaoa",
        "postal_code": "8552"
      },
      {
        "name": "Kanudashkathi",
        "postal_code": "8551"
      }
    ],
    "Kawkhali": [
      {
        "name": "Jolagati",
        "postal_code": "8513"
      },
      {
        "name": "Joykul",
        "postal_code": "8512"
      },
      {
        "name": "Kaukhali",
        "postal_code": "8510"
      },
      {
        "name": "Keundia",
        "postal_code": "8511"
      }
    ],
    "Mathbaria": [
      {
        "name": "Betmor Natun Hat",
        "postal_code": "8565"
      },
      {
        "name": "Gulishakhali",
        "postal_code": "8563"
      },
      {
        "name": "Halta",
        "postal_code": "8562"
      },
      {
        "name": "Shilarganj",
        "postal_code": "8566"
      },
      {
        "name": "Tiarkhali",
        "postal_code": "8564"
      },
      {
        "name": "Tushkhali",
        "postal_code": "8561"
      }
    ],
    "Nazirpur": [
      {
        "name": "Sriramkathi",
        "postal_code": "8541"
      }
    ],
    "Nesarabad": [
      {
        "name": "Darus Sunnat",
        "postal_code": "8521"
      },
      {
        "name": "Jalabari",
        "postal_code": "8523"
      },
      {
        "name": "Kaurikhara",
        "postal_code": "8522"
      },
      {
        "name": "Swarupkathi",
        "postal_code": "8520"
      }
    ],
    "Pirojpur Sadar": [
      {
        "name": "Banaripara",
        "postal_code": "8530"
      },
      {
        "name": "Chakhar",
        "postal_code": "8531"
      },
      {
        "name": "Hularhat",
        "postal_code": "8501"
      },
      {
        "name": "Parerhat",
        "postal_code": "8502"
      }
    ]
  },
  "Rajbari": {
    "Baliakandi": [
      {
        "name": "Nalia",
        "postal_code": "7731"
      }
    ],
    "Pangsha": [
      {
        "name": "Mrigibazar",
        "postal_code": "7723"
      },
      {
        "name": "Ramkol",
        "postal_code": "7721"
      },
      {
        "name": "Ratandia",
        "postal_code": "7722"
      }
    ],
    "Rajbari Sadar": [
      {
        "name": "Goalanda",
        "postal_code": "7710"
      },
      {
        "name": "Khankhanapur",
        "postal_code": "7711"
      }
    ]
  },
  "Rajshahi": {
    "Bagha": [
      {
        "name": "Arani",
        "postal_code": "6281"
      },
      {
        "name": "Bhabaniganj",
        "postal_code": "6250"
      },
      {
        "name": "Taharpur",
        "postal_code": "6251"
      }
    ],
    "Boalia": [
      {
        "name": "Binodpur Bazar",
        "postal_code": "6206"
      },
      {
        "name": "Ghuramara",
        "postal_code": "6100"
      },
      {
        "name": "Kazla",
        "postal_code": "6204"
      },
      {
        "name": "Rajshahi Canttonment",
        "postal_code": "6202"
      },
      {
        "name": "Rajshahi Court",
        "postal_code": "6201"
      },
      {
        "name": "Rajshahi Sadar",
        "postal_code": "6000"
      },
      {
        "name": "Rajshahi University",
        "postal_code": "6205"
      },
      {
        "name": "Sapura",
        "postal_code": "6203"
      }
    ],
    "Charghat": [
      {
        "name": "Sarda",
        "postal_code": "6271"
      }
    ],
    "Godagari": [
      {
        "name": "Premtoli",
        "postal_code": "6291"
      }
    ],
    "Mohonpur": [
      {
        "name": "Khodmohanpur",
        "postal_code": "6220"
      }
    ],
    "Paba": [
      {
        "name": "Lalitganj",
        "postal_code": "6210"
      },
      {
        "name": "Rajshahi Sugar Mills",
        "postal_code": "6211"
      },
      {
        "name": "Shyampur",
        "postal_code": "6212"
      }
    ],
    "Puthia": [
      {
        "name": "Putia",
        "postal_code": "6260"
      }
    ],
    "Tanore": [
      {
        "name": "Tanor",
        "postal_code": "6230"
      }
    ]
  },
  "Rangamati": {
    "Barkal": [
      {
        "name": "Barakal",
        "postal_code": "4570"
      }
    ],
    "Belaichhari": [
      {
        "name": "Bilaichhari",
        "postal_code": "4550"
      }
    ],
    "Juraichhari": [
      {
        "name": "Jarachhari",
        "postal_code": "4560"
      }
    ],
    "Kaptai": [
      {
        "name": "Betbunia",
        "postal_code": "4511"
      },
      {
        "name": "Chandraghona",
        "postal_code": "4531"
      },
      {
        "name": "Kalampati",
        "postal_code": "4510"
      },
      {
        "name": "Kaptai Nuton Bazar",
        "postal_code": "4533"
      },
      {
        "name": "Kaptai Project",
        "postal_code": "4532"
      }
    ],
    "Langadu": [
      {
        "name": "Longachh",
        "postal_code": "4580"
      }
    ],
    "Nannerchar": [
      {
        "name": "Nanichhar",
        "postal_code": "4520"
      }
    ],
    "Rajasthali": [
      {
        "name": "Rajsthali",
        "postal_code": "4540"
      }
    ],
    "Rangamati Sadar": [
      {
        "name": "Marishya",
        "postal_code": "4590"
      }
    ]
  },
  "Rangpur": {
    "Badarganj": [
      {
        "name": "Shyampur",
        "postal_code": "5431"
      }
    ],
    "Gangachhara": [
      {
        "name": "Gangachara",
        "postal_code": "5410"
      }
    ],
    "Kaunia": [
      {
        "name": "Haragachh",
        "postal_code": "5441"
      }
    ],
    "Rangpur Sadar": [
      {
        "name": "Alamnagar",
        "postal_code": "5402"
      },
      {
        "name": "Mahiganj",
        "postal_code": "5403"
      },
      {
        "name": "Rangpur Cadet Colleg",
        "postal_code": "5404"
      },
      {
        "name": "Rangpur Carmiecal Col",
        "postal_code": "5405"
      },
      {
        "name": "Rangpur Upa-Shahar",
        "postal_code": "5401"
      }
    ]
  },
  "Satkhira": {
    "Assasuni": [
      {
        "name": "Ashashuni",
        "postal_code": "9460"
      },
      {
        "name": "Baradal",
        "postal_code": "9461"
      }
    ],
    "Debhata": [
      {
        "name": "Debbhata",
        "postal_code": "9430"
      },
      {
        "name": "Gurugram",
        "postal_code": "9431"
      }
    ],
    "Kalaroa": [
      {
        "name": "Chandanpur",
        "postal_code": "9415"
      },
      {
        "name": "Hamidpur",
        "postal_code": "9413"
      },
      {
        "name": "Jhaudanga",
        "postal_code": "9412"
      },
      {
        "name": "Khordo",
        "postal_code": "9414"
      },
      {
        "name": "Murarikati",
        "postal_code": "9411"
      }
    ],
    "Kaliganj": [
      {
        "name": "Nalta Mubaroknagar",
        "postal_code": "9441"
      },
      {
        "name": "Ratanpur",
        "postal_code": "9442"
      }
    ],
    "Satkhira Sadar": [
      {
        "name": "Budhhat",
        "postal_code": "9403"
      },
      {
        "name": "Gunakar kati",
        "postal_code": "9402"
      },
      {
        "name": "Satkhira Islamia Acc",
        "postal_code": "9401"
      }
    ],
    "Shyamnagar": [
      {
        "name": "Buri Goalini",
        "postal_code": "9453"
      },
      {
        "name": "Gabura",
        "postal_code": "9454"
      },
      {
        "name": "Habinagar",
        "postal_code": "9455"
      },
      {
        "name": "Nakipur",
        "postal_code": "9450"
      },
      {
        "name": "Naobeki",
        "postal_code": "9452"
      },
      {
        "name": "Noornagar",
        "postal_code": "9451"
      }
    ],
    "Tala": [
      {
        "name": "Patkelghata",
        "postal_code": "9421"
      },
      {
        "name": "Taala",
        "postal_code": "9420"
      }
    ]
  },
  "Shariatpur": {
    "Bhedarganj": [
      {
        "name": "Bhedorganj",
        "postal_code": "8030"
      }
    ],
    "Damudya": [
      {
        "name": "Damudhya",
        "postal_code": "8040"
      }
    ],
    "Naria": [
      {
        "name": "Bhozeshwar",
        "postal_code": "8021"
      },
      {
        "name": "Gharisar",
        "postal_code": "8022"
      },
      {
        "name": "Kartikpur",
        "postal_code": "8024"
      },
      {
        "name": "Upshi",
        "postal_code": "8023"
      }
    ],
    "Shariatpur Sadar": [
      {
        "name": "Angaria",
        "postal_code": "8001"
      },
      {
        "name": "Chikandi",
        "postal_code": "8002"
      }
    ],
    "Zajira": [
      {
        "name": "Jajira",
        "postal_code": "8010"
      }
    ]
  },
  "Sherpur": {
    "Jhenaigati": [
      {
        "name": "Jhinaigati",
        "postal_code": "2120"
      }
    ],
    "Nakla": [
      {
        "name": "Gonopaddi",
        "postal_code": "2151"
      }
    ],
    "Nalitabari": [
      {
        "name": "Hatibandha",
        "postal_code": "2111"
      }
    ],
    "Sherpur Sadar": [
      {
        "name": "Bakshigonj",
        "postal_code": "2140"
      },
      {
        "name": "Sherpur Shadar",
        "postal_code": "2100"
      }
    ],
    "Sreebardi": [
      {
        "name": "Shribardi",
        "postal_code": "2130"
      }
    ]
  },
  "Sirajganj": {
    "Belkuchi": [
      {
        "name": "Enayetpur",
        "postal_code": "6751"
      },
      {
        "name": "Rajapur",
        "postal_code": "6742"
      },
      {
        "name": "Sohagpur",
        "postal_code": "6741"
      },
      {
        "name": "Sthal",
        "postal_code": "6752"
      }
    ],
    "Kazipur": [
      {
        "name": "Gandail",
        "postal_code": "6712"
      },
      {
        "name": "Shuvgachha",
        "postal_code": "6711"
      }
    ],
    "Shahjadpur": [
      {
        "name": "Jamirta",
        "postal_code": "6772"
      },
      {
        "name": "Kaijuri",
        "postal_code": "6773"
      },
      {
        "name": "Porjana",
        "postal_code": "6771"
      }
    ],
    "Sirajganj Sadar": [
      {
        "name": "Baiddya Jam Toil",
        "postal_code": "6730"
      },
      {
        "name": "Dhangora",
        "postal_code": "6720"
      },
      {
        "name": "Malonga",
        "postal_code": "6721"
      },
      {
        "name": "Raipur",
        "postal_code": "6701"
      },
      {
        "name": "Rashidabad",
        "postal_code": "6702"
      }
    ],
    "Ullahpara": [
      {
        "name": "Lahiri Mohanpur",
        "postal_code": "6762"
      },
      {
        "name": "Salap",
        "postal_code": "6763"
      },
      {
        "name": "Ullapara",
        "postal_code": "6760"
      },
      {
        "name": "Ullapara R.S",
        "postal_code": "6761"
      }
    ]
  },
  "Sunamganj": {
    "Bishwambarpur": [
      {
        "name": "Bishamsapur",
        "postal_code": "3010"
      }
    ],
    "Chhatak": [
      {
        "name": "Chhatak Cement Facto",
        "postal_code": "3081"
      },
      {
        "name": "Chhatak Paper Mills",
        "postal_code": "3082"
      },
      {
        "name": "Chourangi Bazar",
        "postal_code": "3893"
      },
      {
        "name": "Gabindaganj",
        "postal_code": "3083"
      },
      {
        "name": "Gabindaganj Natun Ba",
        "postal_code": "3084"
      },
      {
        "name": "Islamabad",
        "postal_code": "3088"
      },
      {
        "name": "jahidpur",
        "postal_code": "3087"
      },
      {
        "name": "Khurma",
        "postal_code": "3085"
      },
      {
        "name": "Moinpur",
        "postal_code": "3086"
      }
    ],
    "Derai": [
      {
        "name": "Dhirai Chandpur",
        "postal_code": "3040"
      },
      {
        "name": "Jagdal",
        "postal_code": "3041"
      }
    ],
    "Dowarabazar": [
      {
        "name": "Duara bazar",
        "postal_code": "3070"
      }
    ],
    "Jagannathpur": [
      {
        "name": "Atuajan",
        "postal_code": "3062"
      },
      {
        "name": "Hasan Fatemapur",
        "postal_code": "3063"
      },
      {
        "name": "Jagnnathpur",
        "postal_code": "3060"
      },
      {
        "name": "Rasulganj",
        "postal_code": "3064"
      },
      {
        "name": "Shiramsi",
        "postal_code": "3065"
      },
      {
        "name": "Syedpur",
        "postal_code": "3061"
      }
    ],
    "Sunamganj Sadar": [
      {
        "name": "Ghungiar",
        "postal_code": "3050"
      },
      {
        "name": "Pagla",
        "postal_code": "3001"
      },
      {
        "name": "Patharia",
        "postal_code": "3002"
      },
      {
        "name": "Sachna",
        "postal_code": "3020"
      }
    ]
  },
  "Sylhet": {
    "Balaganj": [
      {
        "name": "Begumpur",
        "postal_code": "3125"
      },
      {
        "name": "Brahman Shashon",
        "postal_code": "3122"
      },
      {
        "name": "Gaharpur",
        "postal_code": "3128"
      },
      {
        "name": "Goala Bazar",
        "postal_code": "3124"
      },
      {
        "name": "Karua",
        "postal_code": "3121"
      },
      {
        "name": "Kathal Khair",
        "postal_code": "3127"
      },
      {
        "name": "Natun Bazar",
        "postal_code": "3129"
      },
      {
        "name": "Omarpur",
        "postal_code": "3126"
      },
      {
        "name": "Tajpur",
        "postal_code": "3123"
      }
    ],
    "Beanibazar": [
      {
        "name": "Bianibazar",
        "postal_code": "3170"
      },
      {
        "name": "Churkai",
        "postal_code": "3175"
      },
      {
        "name": "jaldup",
        "postal_code": "3171"
      },
      {
        "name": "Kurar bazar",
        "postal_code": "3173"
      },
      {
        "name": "Mathiura",
        "postal_code": "3172"
      },
      {
        "name": "Salia bazar",
        "postal_code": "3174"
      }
    ],
    "Bishwanath": [
      {
        "name": "Dashghar",
        "postal_code": "3131"
      },
      {
        "name": "Deokalas",
        "postal_code": "3133"
      },
      {
        "name": "Doulathpur",
        "postal_code": "3132"
      },
      {
        "name": "Singer kanch",
        "postal_code": "3134"
      }
    ],
    "Companiganj": [
      {
        "name": "Kompanyganj",
        "postal_code": "3140"
      }
    ],
    "Fenchuganj": [
      {
        "name": "Fenchuganj SareKarkh",
        "postal_code": "3117"
      }
    ],
    "Golapganj": [
      {
        "name": "banigram",
        "postal_code": "3164"
      },
      {
        "name": "Chandanpur",
        "postal_code": "3165"
      },
      {
        "name": "Dakkhin Bhadashore",
        "postal_code": "3162"
      },
      {
        "name": "Dhaka Dakkhin",
        "postal_code": "3161"
      },
      {
        "name": "Gopalgannj",
        "postal_code": "3160"
      },
      {
        "name": "Ranaping",
        "postal_code": "3163"
      }
    ],
    "Gowainghat": [
      {
        "name": "Chiknagul",
        "postal_code": "3152"
      },
      {
        "name": "Goainhat",
        "postal_code": "3150"
      },
      {
        "name": "Jaflong",
        "postal_code": "3151"
      }
    ],
    "Jaintiapur": [
      {
        "name": "Jainthapur",
        "postal_code": "3156"
      }
    ],
    "Kanaighat": [
      {
        "name": "Chatulbazar",
        "postal_code": "3181"
      },
      {
        "name": "Gachbari",
        "postal_code": "3183"
      },
      {
        "name": "Manikganj",
        "postal_code": "3182"
      }
    ],
    "Sylhet Sadar": [
      {
        "name": "Birahimpur",
        "postal_code": "3106"
      },
      {
        "name": "Jalalabad",
        "postal_code": "3107"
      },
      {
        "name": "Jalalabad Cantoment",
        "postal_code": "3104"
      },
      {
        "name": "Kadamtali",
        "postal_code": "3111"
      },
      {
        "name": "Kamalbazer",
        "postal_code": "3112"
      },
      {
        "name": "Khadimnagar",
        "postal_code": "3103"
      },
      {
        "name": "Lalbazar",
        "postal_code": "3113"
      },
      {
        "name": "Mogla",
        "postal_code": "3108"
      },
      {
        "name": "Ranga Hajiganj",
        "postal_code": "3109"
      },
      {
        "name": "Shahajalal Science &",
        "postal_code": "3114"
      },
      {
        "name": "Silam",
        "postal_code": "3105"
      },
      {
        "name": "Sylhe Sadar",
        "postal_code": "3100"
      },
      {
        "name": "Sylhet Biman Bondar",
        "postal_code": "3102"
      },
      {
        "name": "Sylhet Cadet Col",
        "postal_code": "3101"
      }
    ],
    "Zakiganj": [
      {
        "name": "Ichhamati",
        "postal_code": "3191"
      },
      {
        "name": "Jakiganj",
        "postal_code": "3190"
      }
    ]
  },
  "Tangail": {
    "Delduar": [
      {
        "name": "Elasin",
        "postal_code": "1913"
      },
      {
        "name": "Hinga Nagar",
        "postal_code": "1914"
      },
      {
        "name": "Jangalia",
        "postal_code": "1911"
      },
      {
        "name": "Lowhati",
        "postal_code": "1915"
      },
      {
        "name": "Patharail",
        "postal_code": "1912"
      }
    ],
    "Ghatail": [
      {
        "name": "D. Pakutia",
        "postal_code": "1982"
      },
      {
        "name": "Dhalapara",
        "postal_code": "1983"
      },
      {
        "name": "Ghatial",
        "postal_code": "1980"
      },
      {
        "name": "Lohani",
        "postal_code": "1984"
      },
      {
        "name": "Zahidganj",
        "postal_code": "1981"
      }
    ],
    "Gopalpur": [
      {
        "name": "Hemnagar",
        "postal_code": "1992"
      },
      {
        "name": "Jhowail",
        "postal_code": "1991"
      }
    ],
    "Kalihati": [
      {
        "name": "Ballabazar",
        "postal_code": "1973"
      },
      {
        "name": "Elinga",
        "postal_code": "1974"
      },
      {
        "name": "Nagarbari",
        "postal_code": "1977"
      },
      {
        "name": "Nagarbari SO",
        "postal_code": "1976"
      },
      {
        "name": "Nagbari",
        "postal_code": "1972"
      },
      {
        "name": "Palisha",
        "postal_code": "1975"
      },
      {
        "name": "Rajafair",
        "postal_code": "1971"
      }
    ],
    "Madhupur": [
      {
        "name": "Dhobari",
        "postal_code": "1997"
      }
    ],
    "Mirzapur": [
      {
        "name": "Gorai",
        "postal_code": "1941"
      },
      {
        "name": "Jarmuki",
        "postal_code": "1944"
      },
      {
        "name": "M.C. College",
        "postal_code": "1942"
      },
      {
        "name": "Mohera",
        "postal_code": "1945"
      },
      {
        "name": "Warri paikpara",
        "postal_code": "1943"
      }
    ],
    "Nagarpur": [
      {
        "name": "Dhuburia",
        "postal_code": "1937"
      },
      {
        "name": "Salimabad",
        "postal_code": "1938"
      }
    ],
    "Sakhipur": [
      {
        "name": "Kochua",
        "postal_code": "1951"
      }
    ],
    "Tangail Sadar": [
      {
        "name": "Kagmari",
        "postal_code": "1901"
      },
      {
        "name": "Kashkawlia",
        "postal_code": "1930"
      },
      {
        "name": "Korotia",
        "postal_code": "1903"
      },
      {
        "name": "Purabari",
        "postal_code": "1904"
      },
      {
        "name": "Santosh",
        "postal_code": "1902"
      }
    ]
  },
  "Thakurgaon": {
    "Baliadangi": [
      {
        "name": "Lahiri",
        "postal_code": "5141"
      }
    ],
    "Ranisankail": [
      {
        "name": "Nekmarad",
        "postal_code": "5121"
      }
    ],
    "Thakurgaon Sadar": [
      {
        "name": "Jibanpur",
        "postal_code": "5130"
      },
      {
        "name": "Ruhia",
        "postal_code": "5103"
      },
      {
        "name": "Shibganj",
        "postal_code": "5102"
      },
      {
        "name": "Thakurgaon Road",
        "postal_code": "5101"
      }
    ]
  }
};
