/**
 * Workday Public Job Search — public, no-auth, returns structured JSON
 *
 * Endpoint: https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 * Method: POST
 * Body: { appliedFacets, limit, offset, searchText }
 * Returns: { total, jobPostings: [{ title, externalPath, locationsText, postedOn, bulletFields }] }
 *
 * Cost: FREE
 * Rate limit: per-tenant, ~5 req/sec is safe
 *
 * Verified working: April 2026
 */

// Curated list of Workday tenants — ALL VERIFIED LIVE with curl on April 7, 2026.
// Format: { host: 'subdomain.wdN.myworkdayjobs.com' OR 'wdN.myworkdaysite.com',
//           site: 'tenant/site-name',
//           name: 'Display Name' }
// Two host families exist:
// 1. {tenant}.{wdN}.myworkdayjobs.com (most common)
// 2. {wdN}.myworkdaysite.com/recruiting/{tenant}/{site} (Wells Fargo, AB InBev, etc.)
const WORKDAY_TENANTS = [
    // ── Tech (verified) ──────────────────────────────────────
    { host: 'salesforce.wd12.myworkdayjobs.com',     site: 'salesforce/External_Career_Site', name: 'Salesforce' },
    { host: 'nvidia.wd5.myworkdayjobs.com',          site: 'nvidia/NVIDIAExternalCareerSite', name: 'NVIDIA' },
    { host: 'adobe.wd5.myworkdayjobs.com',           site: 'adobe/external_experienced',      name: 'Adobe' },
    { host: 'intel.wd1.myworkdayjobs.com',           site: 'intel/External',                  name: 'Intel' },
    { host: 'dell.wd1.myworkdayjobs.com',            site: 'dell/External',                   name: 'Dell' },
    { host: 'hp.wd5.myworkdayjobs.com',              site: 'hp/ExternalCareerSite',           name: 'HP' },
    { host: 'hpe.wd5.myworkdayjobs.com',             site: 'hpe/Jobsathpe',                   name: 'HPE' },
    { host: 'workday.wd5.myworkdayjobs.com',         site: 'workday/Workday',                 name: 'Workday' },
    { host: 'analogdevices.wd1.myworkdayjobs.com',   site: 'analogdevices/External',          name: 'Analog Devices' },
    { host: 'cadence.wd1.myworkdayjobs.com',         site: 'cadence/External_Careers',        name: 'Cadence' },
    { host: 'marvell.wd1.myworkdayjobs.com',         site: 'marvell/MarvellCareers',          name: 'Marvell' },
    { host: 'nxp.wd3.myworkdayjobs.com',             site: 'nxp/careers',                     name: 'NXP' },
    { host: 'kainos.wd3.myworkdayjobs.com',          site: 'kainos/kainos',                   name: 'Kainos' },
    { host: 'ciena.wd5.myworkdayjobs.com',           site: 'ciena/Careers',                   name: 'Ciena' },
    { host: 'motorolasolutions.wd5.myworkdayjobs.com', site: 'motorolasolutions/Careers',     name: 'Motorola Solutions' },

    // ── Media / streaming / telecom ──────────────────────────
    { host: 'netflix.wd1.myworkdayjobs.com',         site: 'netflix/Netflix',                 name: 'Netflix' },
    { host: 'disney.wd5.myworkdayjobs.com',          site: 'disney/disneycareer',             name: 'Disney' },
    { host: 'comcast.wd5.myworkdayjobs.com',         site: 'comcast/Comcast_Careers',         name: 'Comcast' },
    { host: 'att.wd1.myworkdayjobs.com',             site: 'att/ATTGeneral',                  name: 'AT&T' },

    // ── Retail ──────────────────────────────────────────────
    { host: 'walmart.wd5.myworkdayjobs.com',         site: 'walmart/WalmartExternal',         name: 'Walmart' },
    { host: 'target.wd5.myworkdayjobs.com',          site: 'target/targetcareers',            name: 'Target' },

    // ── Consumer electronics / appliances ───────────────────
    { host: 'sonyglobal.wd1.myworkdayjobs.com',      site: 'sonyglobal/SonyGlobalCareers',    name: 'Sony Global' },
    { host: 'sec.wd3.myworkdayjobs.com',             site: 'sec/Samsung_Careers',             name: 'Samsung Electronics' },
    { host: 'philips.wd3.myworkdayjobs.com',         site: 'philips/jobs-and-careers',        name: 'Philips' },

    // ── Auto ────────────────────────────────────────────────
    { host: 'generalmotors.wd5.myworkdayjobs.com',   site: 'generalmotors/Careers_GM',        name: 'General Motors' },
    { host: 'toyota.wd503.myworkdayjobs.com',        site: 'toyota/TMNA',                     name: 'Toyota North America' },
    { host: 'toyotaau.wd3.myworkdayjobs.com',        site: 'toyotaau/Careers',                name: 'Toyota Australia' },

    // ── Insurance / banking ─────────────────────────────────
    { host: 'aig.wd1.myworkdayjobs.com',             site: 'aig/AIG',                         name: 'AIG' },
    { host: 'geico.wd1.myworkdayjobs.com',           site: 'geico/External',                  name: 'GEICO' },
    { host: 'rbc.wd3.myworkdayjobs.com',             site: 'rbc/RBCEARLYTALENT1',             name: 'RBC' },
    { host: 'bmo.wd3.myworkdayjobs.com',             site: 'bmo/External',                    name: 'BMO' },
    { host: 'cibc.wd3.myworkdayjobs.com',            site: 'cibc/campus',                     name: 'CIBC' },
    { host: 'manulife.wd3.myworkdayjobs.com',        site: 'manulife/MFCJH_Jobs',             name: 'Manulife' },

    // ── Pharma / healthcare ─────────────────────────────────
    { host: 'pfizer.wd1.myworkdayjobs.com',          site: 'pfizer/PfizerCareers',            name: 'Pfizer' },
    { host: 'astrazeneca.wd3.myworkdayjobs.com',     site: 'astrazeneca/Careers',             name: 'AstraZeneca' },
    { host: 'sanofi.wd3.myworkdayjobs.com',          site: 'sanofi/SanofiCareers',            name: 'Sanofi' },
    { host: 'gsk.wd5.myworkdayjobs.com',             site: 'gsk/GSKCareers',                  name: 'GSK' },
    { host: 'cvshealth.wd1.myworkdayjobs.com',       site: 'cvshealth/CVS_Health_Careers',    name: 'CVS Health' },

    // ── myworkdaysite.com sister-host pattern ───────────────
    { host: 'wd1.myworkdaysite.com',                 site: 'wf/WellsFargoJobs',               name: 'Wells Fargo' },
    { host: 'wd1.myworkdaysite.com',                 site: 'abinbev/GHQ',                     name: 'AB InBev' },
    { host: 'wd1.myworkdaysite.com',                 site: 'ssctech/SSCTechnologies',         name: 'SS&C Technologies' },
    { host: 'wd1.myworkdaysite.com',                 site: 'avnet/External',                  name: 'Avnet' },

    // ════════════════════════════════════════════════════════════════════════
    // EXPANSION BATCH — April 7, 2026: 245 additional tenants live-verified
    // via /wday/cxs/{site}/jobs POST returning non-empty jobPostings
    // ════════════════════════════════════════════════════════════════════════

    // ── Tech / SaaS / Telecom / Consulting / Semis / Gaming / MediaTech ────
    { host: 'zoom.wd5.myworkdayjobs.com',                site: 'zoom/Zoom',                                  name: 'Zoom' },
    { host: 'crowdstrike.wd5.myworkdayjobs.com',         site: 'crowdstrike/crowdstrikecareers',             name: 'CrowdStrike' },
    { host: 'zendesk.wd1.myworkdayjobs.com',             site: 'zendesk/zendesk',                            name: 'Zendesk' },
    { host: 'micron.wd1.myworkdayjobs.com',              site: 'micron/External',                            name: 'Micron Technology' },
    { host: 'tmobile.wd1.myworkdayjobs.com',             site: 'tmobile/External',                           name: 'T-Mobile' },
    { host: 'thomsonreuters.wd5.myworkdayjobs.com',      site: 'thomsonreuters/External_Career_Site',        name: 'Thomson Reuters' },
    { host: 'unisys.wd5.myworkdayjobs.com',              site: 'unisys/External',                            name: 'Unisys' },
    { host: 'zillow.wd5.myworkdayjobs.com',              site: 'zillow/Zillow_Group_External',               name: 'Zillow Group' },
    { host: 'cdk.wd1.myworkdayjobs.com',                 site: 'cdk/CDK',                                    name: 'CDK Global' },
    { host: 'taskus.wd1.myworkdayjobs.com',              site: 'taskus/Careers',                             name: 'TaskUs' },
    { host: 'mavenir.wd1.myworkdayjobs.com',             site: 'mavenir/Mavenir_Careers_1',                  name: 'Mavenir' },
    { host: 'relx.wd3.myworkdayjobs.com',                site: 'relx/relx',                                  name: 'RELX Group' },
    { host: 'globe.wd3.myworkdayjobs.com',               site: 'globe/GLB_Careers',                          name: 'Globe Telecom' },
    { host: 'servicestream.wd3.myworkdayjobs.com',       site: 'servicestream/ServiceStream_Careers',        name: 'Service Stream' },
    { host: 'monolithicpower.wd12.myworkdayjobs.com',    site: 'monolithicpower/MPS_Careers',                name: 'Monolithic Power Systems' },
    { host: 'aveva.wd3.myworkdayjobs.com',               site: 'aveva/RIB_Careers',                          name: 'AVEVA' },
    { host: 'tricentis.wd1.myworkdayjobs.com',           site: 'tricentis/Tricentis_Careers',                name: 'Tricentis' },
    { host: 'autodesk.wd1.myworkdayjobs.com',            site: 'autodesk/Ext',                               name: 'Autodesk' },
    { host: 'mimecast.wd5.myworkdayjobs.com',            site: 'mimecast/Mimecast-Careers',                  name: 'Mimecast' },
    { host: 'onemagnify.wd5.myworkdayjobs.com',          site: 'onemagnify/onemagnify_careers',              name: 'OneMagnify' },
    { host: 'spgi.wd5.myworkdayjobs.com',                site: 'spgi/aM_Careers',                            name: 'S&P Global' },
    { host: 'sailpoint.wd1.myworkdayjobs.com',           site: 'sailpoint/SailPoint',                        name: 'SailPoint' },
    { host: 'cloudera.wd5.myworkdayjobs.com',            site: 'cloudera/External_Career',                   name: 'Cloudera' },
    { host: 'huron.wd1.myworkdayjobs.com',               site: 'huron/huroncareers',                         name: 'Huron Consulting' },
    { host: 'sphera.wd1.myworkdayjobs.com',              site: 'sphera/careers',                             name: 'Sphera' },
    { host: 'epicorsoftware.wd5.myworkdayjobs.com',      site: 'epicorsoftware/epicorjobs',                  name: 'Epicor' },
    { host: 'semtech.wd1.myworkdayjobs.com',             site: 'semtech/SemtechCareers',                     name: 'Semtech' },
    { host: 'microchiphr.wd5.myworkdayjobs.com',         site: 'microchiphr/external',                       name: 'Microchip Technology' },
    { host: 'globalfoundries.wd1.myworkdayjobs.com',     site: 'globalfoundries/External',                   name: 'GlobalFoundries' },
    { host: 'servicetitan.wd1.myworkdayjobs.com',        site: 'servicetitan/ServiceTitan',                  name: 'ServiceTitan' },
    { host: 'guidehouse.wd1.myworkdayjobs.com',          site: 'guidehouse/External',                        name: 'Guidehouse' },
    { host: 'web.wd1.myworkdayjobs.com',                 site: 'web/ExternalCareerSite',                     name: 'Web.com' },
    { host: 'broadcom.wd1.myworkdayjobs.com',            site: 'broadcom/External_Career',                   name: 'Broadcom' },
    { host: 'pluralsight.wd1.myworkdayjobs.com',         site: 'pluralsight/Careers',                        name: 'Pluralsight' },
    { host: 'gen.wd1.myworkdayjobs.com',                 site: 'gen/careers',                                name: 'Gen Digital' },
    { host: 'hrhub.wd3.myworkdayjobs.com',               site: 'hrhub/Euronext_Career_Page',                 name: 'Euronext' },
    { host: 'flutterbe.wd3.myworkdayjobs.com',           site: 'flutterbe/FlutterUKI_External',              name: 'Flutter Entertainment' },
    { host: 'alteryx.wd108.myworkdayjobs.com',           site: 'alteryx/AlteryxCareers',                     name: 'Alteryx' },
    { host: 'omnissa.wd501.myworkdayjobs.com',           site: 'omnissa/Omnissa_External_Career_Site',       name: 'Omnissa' },
    { host: 'redhat.wd5.myworkdayjobs.com',              site: 'redhat/jobs',                                name: 'Red Hat' },
    { host: 'ffive.wd5.myworkdayjobs.com',               site: 'ffive/f5jobs',                               name: 'F5' },
    { host: 'proofpoint.wd5.myworkdayjobs.com',          site: 'proofpoint/ProofpointCareers',               name: 'Proofpoint' },
    { host: 'ringcentral.wd1.myworkdayjobs.com',         site: 'ringcentral/RingCentral_Careers',            name: 'RingCentral' },
    { host: 'q2ebanking.wd5.myworkdayjobs.com',          site: 'q2ebanking/Q2',                              name: 'Q2 Holdings' },
    { host: 'gearbox.wd1.myworkdayjobs.com',             site: 'gearbox/GEC',                                name: 'Gearbox Entertainment' },
    { host: 'transunion.wd5.myworkdayjobs.com',          site: 'transunion/TransUnion',                      name: 'TransUnion' },
    { host: 'costar.wd1.myworkdayjobs.com',              site: 'costar/CoStarCareers',                       name: 'CoStar Group' },
    { host: 'dxctechnology.wd1.myworkdayjobs.com',       site: 'dxctechnology/DXCJobs',                      name: 'DXC Technology' },
    { host: 'operasoftware.wd3.myworkdayjobs.com',       site: 'operasoftware/external',                     name: 'Opera Software' },
    { host: 'draftkings.wd1.myworkdayjobs.com',          site: 'draftkings/DraftKings',                      name: 'DraftKings' },
    { host: 'aspentech.wd5.myworkdayjobs.com',           site: 'aspentech/AspenTech',                        name: 'AspenTech' },
    { host: 'tieto.wd3.myworkdayjobs.com',               site: 'tieto/Tieto_Careers_External_Site',          name: 'Tietoevry' },
    { host: 'ais.wd3.myworkdayjobs.com',                 site: 'ais/Careers',                                name: 'AIS Thailand' },
    { host: 'campaignmonitor.wd5.myworkdayjobs.com',     site: 'campaignmonitor/marigold',                   name: 'Marigold' },
    { host: 'morningstar.wd5.myworkdayjobs.com',         site: 'morningstar/americas',                       name: 'Morningstar' },
    { host: 'dentsuaegis.wd3.myworkdayjobs.com',         site: 'dentsuaegis/DAN_GLOBAL',                     name: 'Dentsu' },
    { host: 'moneris.wd3.myworkdayjobs.com',             site: 'moneris/Moneris',                            name: 'Moneris' },

    // ── Banks / Asset Mgmt / Insurance ─────────────────────────────────────
    { host: 'pnc.wd5.myworkdayjobs.com',                 site: 'pnc/External',                               name: 'PNC' },
    { host: 'td.wd3.myworkdayjobs.com',                  site: 'td/TD_Bank_Careers',                         name: 'TD Bank' },
    { host: 'blackrock.wd1.myworkdayjobs.com',           site: 'blackrock/BlackRock_Professional',           name: 'BlackRock' },
    { host: 'statestreet.wd1.myworkdayjobs.com',         site: 'statestreet/Global',                         name: 'State Street' },
    { host: 'fmr.wd1.myworkdayjobs.com',                 site: 'fmr/FidelityCareers',                        name: 'Fidelity Investments' },
    { host: 'troweprice.wd5.myworkdayjobs.com',          site: 'troweprice/TROWEPRICE',                      name: 'T. Rowe Price' },
    { host: 'regions.wd5.myworkdayjobs.com',             site: 'regions/Regions_Careers',                    name: 'Regions Financial' },
    { host: 'capitalone.wd12.myworkdayjobs.com',         site: 'capitalone/Capital_One',                     name: 'Capital One' },
    { host: 'northwesternmutual.wd5.myworkdayjobs.com',  site: 'northwesternmutual/CORPORATE-CAREERS',       name: 'Northwestern Mutual' },
    { host: 'pru.wd5.myworkdayjobs.com',                 site: 'pru/Careers',                                name: 'Prudential Financial' },
    { host: 'truist.wd1.myworkdayjobs.com',              site: 'truist/Careers',                             name: 'Truist' },
    { host: 'usbank.wd1.myworkdayjobs.com',              site: 'usbank/US_Bank_Careers',                     name: 'U.S. Bank' },
    { host: 'texasmutual.wd1.myworkdayjobs.com',         site: 'texasmutual/texas_mutual_careers',           name: 'Texas Mutual' },
    { host: 'db.wd3.myworkdayjobs.com',                  site: 'db/DBWebsite',                               name: 'Deutsche Bank' },
    { host: 'bbva.wd3.myworkdayjobs.com',                site: 'bbva/BBVA',                                  name: 'BBVA' },
    { host: 'santander.wd3.myworkdayjobs.com',           site: 'santander/SantanderCareers',                 name: 'Santander' },
    { host: 'aviva.wd1.myworkdayjobs.com',               site: 'aviva/External',                             name: 'Aviva' },
    { host: 'sunlife.wd3.myworkdayjobs.com',             site: 'sunlife/Experienced-Jobs',                   name: 'Sun Life Financial' },
    { host: 'desjardins.wd10.myworkdayjobs.com',         site: 'desjardins/Desjardins',                      name: 'Desjardins' },
    { host: 'allstate.wd5.myworkdayjobs.com',            site: 'allstate/allstate_careers',                  name: 'Allstate' },
    { host: 'usaa.wd1.myworkdayjobs.com',                site: 'usaa/USAAJOBSWD',                            name: 'USAA' },
    { host: 'thehartford.wd5.myworkdayjobs.com',         site: 'thehartford/Careers_External',               name: 'The Hartford' },
    { host: 'mtb.wd5.myworkdayjobs.com',                 site: 'mtb/MTB',                                    name: 'M&T Bank' },
    { host: 'keybank.wd5.myworkdayjobs.com',             site: 'keybank/External_Career_Site',               name: 'KeyBank' },
    { host: 'fifththird.wd5.myworkdayjobs.com',          site: 'fifththird/53careers',                       name: 'Fifth Third Bank' },
    { host: 'huntington.wd12.myworkdayjobs.com',         site: 'huntington/HNBcareers',                      name: 'Huntington Bank' },
    { host: 'synchronyfinancial.wd5.myworkdayjobs.com',  site: 'synchronyfinancial/careers',                 name: 'Synchrony Financial' },
    { host: 'travelers.wd5.myworkdayjobs.com',           site: 'travelers/External',                         name: 'Travelers' },
    { host: 'tiaa.wd1.myworkdayjobs.com',                site: 'tiaa/Search',                                name: 'TIAA' },
    { host: 'invesco.wd1.myworkdayjobs.com',             site: 'invesco/IVZ',                                name: 'Invesco' },
    { host: 'nationwide.wd1.myworkdayjobs.com',          site: 'nationwide/Nationwide_Career',               name: 'Nationwide' },
    { host: 'cna.wd1.myworkdayjobs.com',                 site: 'cna/CNA_Careers',                            name: 'CNA Insurance' },
    { host: 'massmutual.wd1.myworkdayjobs.com',          site: 'massmutual/MMAscendCareers',                 name: 'MassMutual Ascend' },
    { host: 'unum.wd1.myworkdayjobs.com',                site: 'unum/External',                              name: 'Unum' },
    { host: 'gnw.wd1.myworkdayjobs.com',                 site: 'gnw/GNW',                                    name: 'Genworth Financial' },
    { host: 'assurant.wd1.myworkdayjobs.com',            site: 'assurant/Assurant_Careers',                  name: 'Assurant' },
    { host: 'raymondjames.wd1.myworkdayjobs.com',        site: 'raymondjames/RaymondJamesCareers',           name: 'Raymond James' },
    { host: 'blackstone.wd1.myworkdayjobs.com',          site: 'blackstone/BX_External_Site',                name: 'Blackstone' },
    { host: 'abglobal.wd1.myworkdayjobs.com',            site: 'abglobal/alliancebernsteincareers',          name: 'AllianceBernstein' },
    { host: 'fil.wd3.myworkdayjobs.com',                 site: 'fil/fidelitycanada',                         name: 'Fidelity International' },
    { host: 'wd3.myworkdaysite.com',                     site: 'lbg/lbg_Careers',                            name: 'Lloyds Banking Group' },
    { host: 'wd3.myworkdaysite.com',                     site: 'abrdn/abrdn',                                name: 'abrdn' },
    { host: 'wd3.myworkdaysite.com',                     site: 'lloyds/Lloyds-of-London',                    name: "Lloyd's of London" },
    { host: 'wd3.myworkdaysite.com',                     site: 'rbs/RBS',                                    name: 'NatWest Group' },
    { host: 'wd5.myworkdaysite.com',                     site: 'godirect/voya_jobs',                         name: 'Voya Financial' },
    { host: 'wd5.myworkdaysite.com',                     site: 'ameriprise/Ameriprise',                      name: 'Ameriprise Financial' },
    { host: 'wd5.myworkdaysite.com',                     site: 'franklintempleton/Primary-External-1',       name: 'Franklin Templeton' },
    { host: 'wd3.myworkdaysite.com',                     site: 'barclays/External_Career_Site_Barclays',     name: 'Barclays' },
    { host: 'astrazeneca.wd3.myworkdayjobs.com',         site: 'astrazeneca/Alexion',                        name: 'Alexion (AstraZeneca)' },

    // ── Pharma / Biotech / MedTech / CRO / Diagnostics ─────────────────────
    { host: 'bristolmyerssquibb.wd5.myworkdayjobs.com',  site: 'bristolmyerssquibb/BMS',                     name: 'Bristol Myers Squibb' },
    { host: 'amgen.wd1.myworkdayjobs.com',               site: 'amgen/Careers',                              name: 'Amgen' },
    { host: 'lilly.wd5.myworkdayjobs.com',               site: 'lilly/LLY',                                  name: 'Eli Lilly' },
    { host: 'medtronic.wd1.myworkdayjobs.com',           site: 'medtronic/MedtronicCareers',                 name: 'Medtronic' },
    { host: 'baxter.wd1.myworkdayjobs.com',              site: 'baxter/baxter',                              name: 'Baxter International' },
    { host: 'bdx.wd1.myworkdayjobs.com',                 site: 'bdx/EXTERNAL_CAREER_SITE_USA',               name: 'Becton Dickinson' },
    { host: 'regeneron.wd1.myworkdayjobs.com',           site: 'regeneron/Careers',                          name: 'Regeneron' },
    { host: 'roche.wd3.myworkdayjobs.com',               site: 'roche/roche-ext',                            name: 'Roche' },
    { host: 'novartis.wd3.myworkdayjobs.com',            site: 'novartis/Novartis_Careers',                  name: 'Novartis' },
    { host: 'takeda.wd3.myworkdayjobs.com',              site: 'takeda/External',                            name: 'Takeda' },
    { host: 'stryker.wd1.myworkdayjobs.com',             site: 'stryker/StrykerCareers',                     name: 'Stryker' },
    { host: 'edwards.wd5.myworkdayjobs.com',             site: 'edwards/edwardscareers',                     name: 'Edwards Lifesciences' },
    { host: 'dexcom.wd1.myworkdayjobs.com',              site: 'dexcom/Dexcom',                              name: 'Dexcom' },
    { host: 'iqvia.wd1.myworkdayjobs.com',               site: 'iqvia/IQVIA',                                name: 'IQVIA' },
    { host: 'labcorp.wd1.myworkdayjobs.com',             site: 'labcorp/External',                           name: 'Labcorp' },
    { host: 'abbott.wd5.myworkdayjobs.com',              site: 'abbott/abbottcareers',                       name: 'Abbott' },
    { host: 'modernatx.wd1.myworkdayjobs.com',           site: 'modernatx/M_tx',                             name: 'Moderna' },
    { host: 'vrtx.wd501.myworkdayjobs.com',              site: 'vrtx/Vertex_Careers',                        name: 'Vertex Pharmaceuticals' },
    { host: 'biibhr.wd3.myworkdayjobs.com',              site: 'biibhr/external',                            name: 'Biogen' },
    { host: 'sumitomopharma.wd5.myworkdayjobs.com',      site: 'sumitomopharma/SMPA',                        name: 'Sumitomo Pharma America' },
    { host: 'eisai.wd5.myworkdayjobs.com',               site: 'eisai/eisai',                                name: 'Eisai' },
    { host: 'agilent.wd5.myworkdayjobs.com',             site: 'agilent/Agilent_Careers',                    name: 'Agilent Technologies' },
    { host: 'biotechne.wd5.myworkdayjobs.com',           site: 'biotechne/Biotechne',                        name: 'Bio-Techne' },
    { host: 'wd1.myworkdaysite.com',                     site: 'parexel/Parexel_External_Careers',           name: 'Parexel' },
    { host: 'syneoshealth.wd12.myworkdayjobs.com',       site: 'syneoshealth/Syneos_Health_External_Site',   name: 'Syneos Health' },
    { host: 'viatris.wd5.myworkdayjobs.com',             site: 'viatris/External',                           name: 'Viatris' },
    { host: 'resmed.wd3.myworkdayjobs.com',              site: 'resmed/ResMed_External_Careers',             name: 'ResMed' },

    // ── Health Insurers / Hospital Systems ─────────────────────────────────
    { host: 'cigna.wd5.myworkdayjobs.com',               site: 'cigna/cignacareers',                         name: 'Cigna' },
    { host: 'centene.wd5.myworkdayjobs.com',             site: 'centene/Centene_External',                   name: 'Centene' },
    { host: 'elevancehealth.wd1.myworkdayjobs.com',      site: 'elevancehealth/ANT',                         name: 'Elevance Health' },
    { host: 'ccf.wd1.myworkdayjobs.com',                 site: 'ccf/ClevelandClinicCareers',                 name: 'Cleveland Clinic' },
    { host: 'davita.wd1.myworkdayjobs.com',              site: 'davita/DKC_External',                        name: 'DaVita' },
    { host: 'stanfordhealthcare.wd5.myworkdayjobs.com',  site: 'stanfordhealthcare/SHC_External_Career_Site',name: 'Stanford Health Care' },
    { host: 'stanfordhealthcare.wd5.myworkdayjobs.com',  site: 'stanfordhealthcare/UHA_External_Careers',    name: 'Stanford UHA' },
    { host: 'imh.wd108.myworkdayjobs.com',               site: 'imh/IntermountainCareers',                   name: 'Intermountain Health' },
    { host: 'massgeneralbrigham.wd1.myworkdayjobs.com',  site: 'massgeneralbrigham/PhysicianOrganization',   name: 'Mass General Brigham' },
    { host: 'vumc.wd1.myworkdayjobs.com',                site: 'vumc/vumccareers',                           name: 'Vanderbilt University Medical Center' },
    { host: 'nyp.wd1.myworkdayjobs.com',                 site: 'nyp/nypcareers',                             name: 'NewYork-Presbyterian' },

    // ── Retail / Apparel / E-commerce ──────────────────────────────────────
    { host: 'lowes.wd5.myworkdayjobs.com',               site: 'lowes/LWS_External_CS',                      name: "Lowe's" },
    { host: 'tjx.wd1.myworkdayjobs.com',                 site: 'tjx/Tjx_External',                           name: 'TJX Companies' },
    { host: 'kohls.wd1.myworkdayjobs.com',               site: 'kohls/KohlsCareers',                         name: "Kohl's" },
    { host: 'homedepot.wd5.myworkdayjobs.com',           site: 'homedepot/CareerDepot',                      name: 'Home Depot' },
    { host: 'dollartree.wd5.myworkdayjobs.com',          site: 'dollartree/DollarTreeUS',                    name: 'Dollar Tree (US)' },
    { host: 'dollartree.wd5.myworkdayjobs.com',          site: 'dollartree/dollartreeca',                    name: 'Dollar Tree (Canada)' },
    { host: 'nordstrom.wd501.myworkdayjobs.com',         site: 'nordstrom/nordstrom_careers',                name: 'Nordstrom' },
    { host: 'petco.wd1.myworkdayjobs.com',               site: 'petco/External',                             name: 'Petco' },
    { host: 'oreillyauto.wd1.myworkdayjobs.com',         site: 'oreillyauto/oreilly',                        name: "O'Reilly Auto Parts" },
    { host: 'advanceauto.wd5.myworkdayjobs.com',         site: 'advanceauto/AdvanceExternalCareers',         name: 'Advance Auto Parts' },
    { host: 'nike.wd1.myworkdayjobs.com',                site: 'nike/nke',                                   name: 'Nike' },
    { host: 'pvh.wd1.myworkdayjobs.com',                 site: 'pvh/Pvh_Careers',                            name: 'PVH' },

    // ── CPG / Food / Beverage ──────────────────────────────────────────────
    { host: 'unilever.wd3.myworkdayjobs.com',            site: 'unilever/Unilever_Experienced_Professionals',name: 'Unilever' },
    { host: 'mdlz.wd3.myworkdayjobs.com',                site: 'mdlz/External',                              name: 'Mondelez International' },
    { host: 'heinz.wd1.myworkdayjobs.com',               site: 'heinz/KraftHeinz_Careers',                   name: 'Kraft Heinz' },
    { host: 'conagrabrands.wd1.myworkdayjobs.com',       site: 'conagrabrands/Careers_US',                   name: 'Conagra Brands' },
    { host: 'tysonfoods.wd5.myworkdayjobs.com',          site: 'tysonfoods/TSN',                             name: 'Tyson Foods' },
    { host: 'smithfieldfoods.wd1.myworkdayjobs.com',     site: 'smithfieldfoods/Careers',                    name: 'Smithfield Foods' },
    { host: 'clorox.wd1.myworkdayjobs.com',              site: 'clorox/Clorox',                              name: 'Clorox' },
    { host: 'churchdwight.wd1.myworkdayjobs.com',        site: 'churchdwight/chdcareers',                    name: 'Church & Dwight' },
    { host: 'coke.wd1.myworkdayjobs.com',                site: 'coke/coca-cola-careers',                     name: 'Coca-Cola' },
    { host: 'diageo.wd3.myworkdayjobs.com',              site: 'diageo/Diageo_Careers',                      name: 'Diageo' },
    { host: 'pernodricard.wd3.myworkdayjobs.com',        site: 'pernodricard/pernod-ricard',                 name: 'Pernod Ricard' },
    { host: 'bf.wd5.myworkdayjobs.com',                  site: 'bf/USA_Canada',                              name: 'Brown-Forman' },

    // ── Auto OEM / Suppliers / Tire / Retail ───────────────────────────────
    { host: 'alliance.wd3.myworkdayjobs.com',            site: 'alliance/nissanjobs',                        name: 'Nissan' },
    { host: 'alliancewd.wd3.myworkdayjobs.com',          site: 'alliancewd/renault-group-careers',           name: 'Renault Group' },
    { host: 'stellantis.wd3.myworkdayjobs.com',          site: 'stellantis/External_Career_Site_ID01',       name: 'Stellantis' },
    { host: 'ch.wd3.myworkdayjobs.com',                  site: 'ch/Honda_Canada',                            name: 'Honda Canada' },
    { host: 'adient.wd3.myworkdayjobs.com',              site: 'adient/External',                            name: 'Adient' },
    { host: 'borgwarner.wd5.myworkdayjobs.com',          site: 'borgwarner/BorgWarner_Careers',              name: 'BorgWarner' },
    { host: 'aptiv.wd5.myworkdayjobs.com',               site: 'aptiv/APTIV_CAREERS',                        name: 'Aptiv' },
    { host: 'valeo.wd3.myworkdayjobs.com',               site: 'valeo/valeo_jobs',                           name: 'Valeo' },
    { host: 'goodyear.wd1.myworkdayjobs.com',            site: 'goodyear/GoodyearCareers',                   name: 'Goodyear' },
    { host: 'bridgestone.wd5.myworkdayjobs.com',         site: 'bridgestone/External',                       name: 'Bridgestone' },
    { host: 'michelinhr.wd3.myworkdayjobs.com',          site: 'michelinhr/Michelin',                        name: 'Michelin' },
    { host: 'autonation.wd5.myworkdayjobs.com',          site: 'autonation/Careers',                         name: 'AutoNation' },
    { host: 'holmanautogroup.wd1.myworkdayjobs.com',     site: 'holmanautogroup/HolmanEnterprisesCareers',   name: 'Holman Enterprises' },
    { host: 'lithia.wd5.myworkdayjobs.com',              site: 'lithia/PfaffCareers',                        name: 'Lithia/Pfaff' },
    { host: 'capitalauto.wd3.myworkdayjobs.com',         site: 'capitalauto/capitalautogroupcareers',        name: 'Capital Auto Group' },

    // ── Aerospace / Defense ────────────────────────────────────────────────
    { host: 'boeing.wd1.myworkdayjobs.com',              site: 'boeing/External_Careers',                    name: 'Boeing' },
    { host: 'ag.wd3.myworkdayjobs.com',                  site: 'ag/Airbus',                                  name: 'Airbus' },
    { host: 'globalhr.wd5.myworkdayjobs.com',            site: 'globalhr/REC_RTX_Ext_Gateway',               name: 'RTX (Raytheon)' },
    { host: 'ngc.wd1.myworkdayjobs.com',                 site: 'ngc/Northrop_Grumman_External_Site',         name: 'Northrop Grumman' },
    { host: 'rollsroyce.wd3.myworkdayjobs.com',          site: 'rollsroyce/Professional',                    name: 'Rolls-Royce' },
    { host: 'rollsroycesmr.wd103.myworkdayjobs.com',     site: 'rollsroycesmr/RRSMR',                        name: 'Rolls-Royce SMR' },

    // ── Industrial / Machinery / HVAC ──────────────────────────────────────
    { host: 'cat.wd5.myworkdayjobs.com',                 site: 'cat/CaterpillarCareers',                     name: 'Caterpillar' },
    { host: 'finning.wd3.myworkdayjobs.com',             site: 'finning/External',                           name: 'Finning' },
    { host: 'zieglercat.wd1.myworkdayjobs.com',          site: 'zieglercat/zieglercat',                      name: 'Ziegler CAT' },
    { host: 'rockwellautomation.wd1.myworkdayjobs.com',  site: 'rockwellautomation/External_Rockwell_Automation', name: 'Rockwell Automation' },
    { host: 'hitachi.wd1.myworkdayjobs.com',             site: 'hitachi/hitachi',                            name: 'Hitachi' },
    { host: 'kone.wd3.myworkdayjobs.com',                site: 'kone/Careers',                               name: 'KONE' },
    { host: 'otis.wd5.myworkdayjobs.com',                site: 'otis/REC_Ext_Gateway',                       name: 'Otis Elevator' },
    { host: 'carrier.wd5.myworkdayjobs.com',             site: 'carrier/jobs',                               name: 'Carrier Global' },
    { host: '3m.wd1.myworkdayjobs.com',                  site: '3m/Search',                                  name: '3M' },
    { host: 'comfortsystemsusa.wd1.myworkdayjobs.com',   site: 'comfortsystemsusa/Amteckcareers',            name: 'Comfort Systems USA' },

    // ── Chemicals / Materials ──────────────────────────────────────────────
    { host: 'dow.wd1.myworkdayjobs.com',                 site: 'dow/ExternalCareers',                        name: 'Dow' },
    { host: 'dupont.wd5.myworkdayjobs.com',              site: 'dupont/Jobs',                                name: 'DuPont' },
    { host: 'fmc.wd12.myworkdayjobs.com',                site: 'fmc/FMC',                                    name: 'FMC Corporation' },
    { host: 'corteva.wd5.myworkdayjobs.com',             site: 'corteva/Corteva',                            name: 'Corteva Agriscience' },
    { host: 'airliquidehr.wd3.myworkdayjobs.com',        site: 'airliquidehr/AirLiquideExternalCareer',      name: 'Air Liquide' },
    { host: 'airproducts.wd5.myworkdayjobs.com',         site: 'airproducts/AP0001',                         name: 'Air Products' },

    // ── Energy / Utilities / Mining ────────────────────────────────────────
    { host: 'chevron.wd5.myworkdayjobs.com',             site: 'chevron/jobs',                               name: 'Chevron' },
    { host: 'chevronstations.wd1.myworkdayjobs.com',     site: 'chevronstations/CSI',                        name: 'Chevron Stations' },
    { host: 'shell.wd3.myworkdayjobs.com',               site: 'shell/ShellCareers',                         name: 'Shell' },
    { host: 'repsol.wd3.myworkdayjobs.com',              site: 'repsol/Repsol',                              name: 'Repsol' },
    { host: 'conocophillips.wd1.myworkdayjobs.com',      site: 'conocophillips/External',                    name: 'ConocoPhillips' },
    { host: 'bakerhughes.wd5.myworkdayjobs.com',         site: 'bakerhughes/BakerHughes',                    name: 'Baker Hughes' },
    { host: 'dukeenergy.wd1.myworkdayjobs.com',          site: 'dukeenergy/search',                          name: 'Duke Energy' },
    { host: 'iberdrola.wd3.myworkdayjobs.com',           site: 'iberdrola/iberdrola',                        name: 'Iberdrola' },
    { host: 'aksteel.wd1.myworkdayjobs.com',             site: 'aksteel/careers',                            name: 'Cleveland-Cliffs' },

    // ── Logistics / Shipping / Airlines ────────────────────────────────────
    { host: 'fedex.wd1.myworkdayjobs.com',               site: 'fedex/FXE-LAC_External_Career_Site',         name: 'FedEx Express LAC' },
    { host: 'hcmportal.wd5.myworkdayjobs.com',           site: 'hcmportal/Search',                           name: 'UPS' },
    { host: 'maersk.wd3.myworkdayjobs.com',              site: 'maersk/Maersk_Careers',                      name: 'Maersk' },
    { host: 'maersk.wd3.myworkdayjobs.com',              site: 'maersk/Maersk_Manual',                       name: 'Maersk Manual' },
    { host: 'odfl.wd1.myworkdayjobs.com',                site: 'odfl/ODFL_Careers',                          name: 'Old Dominion Freight Line' },
    { host: 'saia.wd1.myworkdayjobs.com',                site: 'saia/SaiaCareers',                           name: 'Saia LTL Freight' },
    { host: 'ryder.wd5.myworkdayjobs.com',               site: 'ryder/RyderCareers',                         name: 'Ryder System' },
    { host: 'uaa.wd12.myworkdayjobs.com',                site: 'uaa/EXT',                                    name: 'United Aviate Academy' },
    { host: 'aaregional.wd5.myworkdayjobs.com',          site: 'aaregional/Search',                          name: 'Piedmont Airlines' },

    // ── Hospitality / Restaurants / Foodservice ────────────────────────────
    { host: 'mymvw.wd5.myworkdayjobs.com',               site: 'mymvw/MVW',                                  name: 'Marriott Vacations Worldwide' },
    { host: 'mgmresorts.wd5.myworkdayjobs.com',          site: 'mgmresorts/MGMCareers',                      name: 'MGM Resorts' },
    { host: 'betmgminc.wd5.myworkdayjobs.com',           site: 'betmgminc/BetMGM',                           name: 'BetMGM' },
    { host: 'papajohns.wd1.myworkdayjobs.com',           site: 'papajohns/PapaJohnsCareers',                 name: "Papa John's" },
    { host: 'rbi.wd3.myworkdayjobs.com',                 site: 'rbi/RBI_External_Career_Site',               name: 'Restaurant Brands International' },
    { host: 'sysco.wd5.myworkdayjobs.com',               site: 'sysco/syscocareers',                         name: 'Sysco' },

    // ── Real Estate / REITs ────────────────────────────────────────────────
    { host: 'simon.wd1.myworkdayjobs.com',               site: 'simon/Simon',                                name: 'Simon Property Group' },
    { host: 'jll.wd1.myworkdayjobs.com',                 site: 'jll/jllcareers',                             name: 'JLL' },
    { host: 'prologis.wd5.myworkdayjobs.com',            site: 'prologis/Prologis_External_Careers',         name: 'Prologis' },
    { host: 'equinix.wd1.myworkdayjobs.com',             site: 'equinix/External',                           name: 'Equinix' },
    { host: 'sbasite.wd5.myworkdayjobs.com',             site: 'sbasite/SBA_Communications_Careers',         name: 'SBA Communications' },
    { host: 'essex.wd5.myworkdayjobs.com',               site: 'essex/essexcareers',                         name: 'Essex Property Trust' },
    { host: 'redfin.wd1.myworkdayjobs.com',              site: 'redfin/Redfin_Careers',                      name: 'Redfin' },

    // ── Education / Universities ───────────────────────────────────────────
    { host: 'upenn.wd1.myworkdayjobs.com',               site: 'upenn/careers-at-penn',                      name: 'University of Pennsylvania' },
    { host: 'cornell.wd1.myworkdayjobs.com',             site: 'cornell/CornellCareerPage',                  name: 'Cornell University' },
    { host: 'psu.wd1.myworkdayjobs.com',                 site: 'psu/PSU_Staff',                              name: 'Penn State University' },
    { host: 'brown.wd5.myworkdayjobs.com',               site: 'brown/staff-careers-brown',                  name: 'Brown University' },
    { host: 'cmu.wd5.myworkdayjobs.com',                 site: 'cmu/CMU',                                    name: 'Carnegie Mellon University' },
    { host: 'usc.wd5.myworkdayjobs.com',                 site: 'usc/ExternalUSCCareers',                     name: 'University of Southern California' },
    { host: 'georgetown.wd1.myworkdayjobs.com',          site: 'georgetown/Georgetown_Admin_Careers',        name: 'Georgetown University' },
    { host: 'osu.wd1.myworkdayjobs.com',                 site: 'osu/OSUCareers',                             name: 'The Ohio State University' },
    { host: 'utaustin.wd1.myworkdayjobs.com',            site: 'utaustin/UTstaff',                           name: 'University of Texas at Austin' },
    { host: 'usfca.wd5.myworkdayjobs.com',               site: 'usfca/USF_Staff',                            name: 'University of San Francisco' },
    { host: 'miamioh.wd5.myworkdayjobs.com',             site: 'miamioh/miamioh-staff',                      name: 'Miami University Ohio' },
    { host: 'northeastern.wd1.myworkdayjobs.com',        site: 'northeastern/careers',                       name: 'Northeastern University' },
    { host: 'byu.wd1.myworkdayjobs.com',                 site: 'byu/faculty-careers',                        name: 'Brigham Young University' },

    // ════════════════════════════════════════════════════════════════════════
    // EXPANSION ROUND 2 — April 8, 2026: 198 additional verified tenants
    // International + government + healthcare + mid-cap specialty verticals
    // ════════════════════════════════════════════════════════════════════════

    // ── More US Universities ──
    { host: 'yale.wd1.myworkdayjobs.com', site: 'yale/External_Career_Site', name: 'Yale University' },
    { host: 'american.wd1.myworkdayjobs.com', site: 'american/AU', name: 'American University' },
    { host: 'usnh.wd5.myworkdayjobs.com', site: 'usnh/Careers', name: 'University System of New Hampshire' },
    { host: 'lsu.wd1.myworkdayjobs.com', site: 'lsu/LSU', name: 'Louisiana State University' },
    { host: 'montclair.wd1.myworkdayjobs.com', site: 'montclair/JobOpportunities', name: 'Montclair State University' },
    { host: 'marymount.wd5.myworkdayjobs.com', site: 'marymount/Careers', name: 'Marymount University' },
    { host: 'wisconsin.wd1.myworkdayjobs.com', site: 'wisconsin/UW_Madison', name: 'University of Wisconsin-Madison' },
    { host: 'tamus.wd1.myworkdayjobs.com', site: 'tamus/TAMU_External', name: 'Texas A&M University System' },
    { host: 'fau.wd1.myworkdayjobs.com', site: 'fau/FAU', name: 'Florida Atlantic University' },
    { host: 'loyola.wd5.myworkdayjobs.com', site: 'loyola/External', name: 'Loyola University Maryland' },
    { host: 'lmu.wd1.myworkdayjobs.com', site: 'lmu/Careers', name: 'Loyola Marymount University' },
    { host: 'newschool.wd1.myworkdayjobs.com', site: 'newschool/External', name: 'The New School' },
    { host: 'carleton.wd1.myworkdayjobs.com', site: 'carleton/CarletonCareers', name: 'Carleton College' },
    { host: 'merceruniversity.wd1.myworkdayjobs.com', site: 'merceruniversity/external', name: 'Mercer University' },

    // ── International Universities ──
    { host: 'mcgill.wd3.myworkdayjobs.com', site: 'mcgill/mcgill_careers', name: 'McGill University' },
    { host: 'ubc.wd10.myworkdayjobs.com', site: 'ubc/ubcstaffjobs', name: 'University of British Columbia (Staff)' },
    { host: 'ubc.wd10.myworkdayjobs.com', site: 'ubc/ubcfacultyjobs', name: 'University of British Columbia (Faculty)' },
    { host: 'uq.wd3.myworkdayjobs.com', site: 'uq/uqcareers', name: 'University of Queensland' },
    { host: 'usyd.wd105.myworkdayjobs.com', site: 'usyd/USYD_EXTERNAL_CAREER_SITE', name: 'University of Sydney' },
    { host: 'unimelb.wd105.myworkdayjobs.com', site: 'unimelb/UoM_External_Career', name: 'University of Melbourne' },
    { host: 'nus.wd1.myworkdayjobs.com', site: 'nus/Careers', name: 'National University of Singapore' },

    // ── US Hospital Systems ──
    { host: 'kansashealthsystem.wd1.myworkdayjobs.com', site: 'kansashealthsystem/careers', name: 'University of Kansas Health System' },
    { host: 'memorialhealthcare.wd1.myworkdayjobs.com', site: 'memorialhealthcare/MHS_Careers', name: 'Memorial Healthcare System' },
    { host: 'wvumedicine.wd1.myworkdayjobs.com', site: 'wvumedicine/WVUH', name: 'WVU Medicine' },
    { host: 'hshs.wd1.myworkdayjobs.com', site: 'hshs/hshscareers', name: 'Hospital Sisters Health System' },
    { host: 'methodisthealthsystem.wd1.myworkdayjobs.com', site: 'methodisthealthsystem/MHS_Careers', name: 'Methodist Health System Dallas' },
    { host: 'nshs.wd1.myworkdayjobs.com', site: 'nshs/ns-eeh', name: 'Endeavor Health' },
    { host: 'nghs.wd1.myworkdayjobs.com', site: 'nghs/External', name: 'Northeast Georgia Health System' },
    { host: 'bhs.wd1.myworkdayjobs.com', site: 'bhs/careers', name: 'Baptist Health' },
    { host: 'ohiohealth.wd5.myworkdayjobs.com', site: 'ohiohealth/OhioHealthJobs', name: 'OhioHealth' },
    { host: 'sentara.wd1.myworkdayjobs.com', site: 'sentara/SCS', name: 'Sentara Health' },
    { host: 'wellstar.wd1.myworkdayjobs.com', site: 'wellstar/wellstarprovidercareers', name: 'Wellstar Health System' },
    { host: 'easyservice.wd5.myworkdayjobs.com', site: 'easyservice/MercyHealthCareers', name: 'Mercy Health' },
    { host: 'avera.wd5.myworkdayjobs.com', site: 'avera/avera-careers', name: 'Avera Health' },
    { host: 'allina.wd5.myworkdayjobs.com', site: 'allina/External', name: 'Allina Health' },
    { host: 'sanford.wd5.myworkdayjobs.com', site: 'sanford/SanfordHealth', name: 'Sanford Health' },
    { host: 'bilh.wd1.myworkdayjobs.com', site: 'bilh/External', name: 'Beth Israel Lahey Health' },
    { host: 'nyp.wd1.myworkdayjobs.com', site: 'nyp/nyp_1199', name: 'NewYork-Presbyterian (1199 Union)' },
    { host: 'evolent.wd1.myworkdayjobs.com', site: 'evolent/External', name: 'Evolent Health' },

    // ── Children's Hospitals ──
    { host: 'cwi.wd1.myworkdayjobs.com', site: 'cwi/CW_Careers', name: "Children's Wisconsin" },
    { host: 'cookchildrens.wd1.myworkdayjobs.com', site: 'cookchildrens/Cook_Childrens_Careers', name: "Cook Children's" },
    { host: 'luriechildrens.wd1.myworkdayjobs.com', site: 'luriechildrens/externalportal', name: "Lurie Children's Hospital" },
    { host: 'nationwidechildrens.wd5.myworkdayjobs.com', site: 'nationwidechildrens/NCHCareers', name: "Nationwide Children's Hospital" },
    { host: 'archildrens.wd1.myworkdayjobs.com', site: 'archildrens/External_Career_Site', name: "Arkansas Children's" },
    { host: 'choa.wd12.myworkdayjobs.com', site: 'choa/externalcareers', name: "Children's Healthcare of Atlanta" },

    // ── K-12 Schools ──
    { host: 'dcsd.wd5.myworkdayjobs.com', site: 'dcsd/DCSD', name: 'Douglas County School District CO' },
    { host: 'flvs.wd1.myworkdayjobs.com', site: 'flvs/FLVS_Jobs', name: 'Florida Virtual School' },
    { host: 'ksbe.wd1.myworkdayjobs.com', site: 'ksbe/External', name: 'Kamehameha Schools' },
    { host: 'clevelandmetroschools.wd1.myworkdayjobs.com', site: 'clevelandmetroschools/jobs', name: 'Cleveland Metropolitan School District' },

    // ── State / County / International Government ──
    { host: 'nc.wd108.myworkdayjobs.com', site: 'nc/NC_Careers', name: 'State of North Carolina' },
    { host: 'okgov.wd1.myworkdayjobs.com', site: 'okgov/okgovjobs', name: 'State of Oklahoma' },
    { host: 'maine.wd5.myworkdayjobs.com', site: 'maine/Executive', name: 'State of Maine' },
    { host: 'minnstate.wd1.myworkdayjobs.com', site: 'minnstate/Minnesota_State_Careers', name: 'Minnesota State' },
    { host: 'oregon.wd5.myworkdayjobs.com', site: 'oregon/SOR_External_Career_Site', name: 'State of Oregon' },
    { host: 'denver.wd1.myworkdayjobs.com', site: 'denver/CCD-denver-denvergov-CSC_Jobs-Civil_service_jobs-Police_Jobs-Fire_Jobs', name: 'City of Denver' },
    { host: 'maricopa.wd1.myworkdayjobs.com', site: 'maricopa/MC_External', name: 'Maricopa County AZ' },
    { host: 'clarkcountywashington.wd1.myworkdayjobs.com', site: 'clarkcountywashington/ClarkCountyJobs', name: 'Clark County Washington' },
    { host: 'hamiltoncountyindiana.wd1.myworkdayjobs.com', site: 'hamiltoncountyindiana/Careers', name: 'Hamilton County Indiana' },
    { host: 'richlandonline.wd5.myworkdayjobs.com', site: 'richlandonline/richlandcountygovcareers', name: 'Richland County SC' },
    { host: 'tulsacounty.wd1.myworkdayjobs.com', site: 'tulsacounty/TC', name: 'Tulsa County OK' },
    { host: 'nztagovtnz.wd3.myworkdayjobs.com', site: 'nztagovtnz/nztagovtnz', name: 'NZ Transport Agency' },
    { host: 'rbnz.wd3.myworkdayjobs.com', site: 'rbnz/RBNZ', name: 'Reserve Bank of New Zealand' },

    // ── Foundations / Non-profits ──
    { host: 'fordfoundation.wd1.myworkdayjobs.com', site: 'fordfoundation/FordFoundationCareerPage', name: 'Ford Foundation' },
    { host: 'macfound.wd1.myworkdayjobs.com', site: 'macfound/MAC_FOUND_EXT_CAREERS', name: 'MacArthur Foundation' },
    { host: 'simonsfoundation.wd1.myworkdayjobs.com', site: 'simonsfoundation/simonsfoundationcareers', name: 'Simons Foundation' },
    { host: 'obama.wd5.myworkdayjobs.com', site: 'obama/Careers', name: 'Obama Foundation' },
    { host: 'foundationccc.wd1.myworkdayjobs.com', site: 'foundationccc/fccc-careers', name: 'Foundation for CA Community Colleges' },
    { host: 'americanredcross.wd1.myworkdayjobs.com', site: 'americanredcross/American_Red_Cross_Careers', name: 'American Red Cross' },
    { host: 'ymcaatlanta.wd1.myworkdayjobs.com', site: 'ymcaatlanta/YMCA-Careers', name: 'YMCA Atlanta' },
    { host: 'goodwillaz.wd1.myworkdayjobs.com', site: 'goodwillaz/GoodwillAZ', name: 'Goodwill Arizona' },
    { host: 'worldvision.wd1.myworkdayjobs.com', site: 'worldvision/WorldVisionInternational', name: 'World Vision International' },
    { host: 'ccrcca.wd1.myworkdayjobs.com', site: 'ccrcca/Careers', name: 'Child Care Resource Center CA' },
    { host: 'unhcr.wd3.myworkdayjobs.com', site: 'unhcr/External', name: 'UNHCR (UN Refugee Agency)' },

    // ── Asia-Pacific (Japan / Korea / China / HK / SEA) ──
    { host: 'rakuten.wd1.myworkdayjobs.com', site: 'rakuten/RakutenInc', name: 'Rakuten' },
    { host: 'mizuhogroup.wd102.myworkdayjobs.com', site: 'mizuhogroup/External', name: 'Mizuho Group' },
    { host: 'mizuho.wd1.myworkdayjobs.com', site: 'mizuho/mizuhoamericas', name: 'Mizuho Americas' },
    { host: 'nttlimited.wd3.myworkdayjobs.com', site: 'nttlimited/NTT_Careers', name: 'NTT Limited' },
    { host: 'nttglobaldatacenters.wd501.myworkdayjobs.com', site: 'nttglobaldatacenters/External', name: 'NTT Global Data Centers' },
    { host: 'mitsubishichemicalgroup.wd3.myworkdayjobs.com', site: 'mitsubishichemicalgroup/MCCGroupCareers', name: 'Mitsubishi Chemical Group' },
    { host: 'fujifilmdiosynth.wd3.myworkdayjobs.com', site: 'fujifilmdiosynth/External', name: 'Fujifilm Diosynth' },
    { host: 'mufgub.wd3.myworkdayjobs.com', site: 'mufgub/MUFG-Careers', name: 'MUFG Union Bank' },
    { host: 'tencent.wd1.myworkdayjobs.com', site: 'tencent/Tencent_Careers', name: 'Tencent' },
    { host: 'tencent.wd1.myworkdayjobs.com', site: 'tencent/internal_bole', name: 'Tencent Bole' },
    { host: 'fastretailing.wd3.myworkdayjobs.com', site: 'fastretailing/retail_us_Uniqlo', name: 'Uniqlo US' },
    { host: 'fastretailing.wd3.myworkdayjobs.com', site: 'fastretailing/store_staff_eu_Uniqlo', name: 'Uniqlo EU' },
    { host: 'ocbc.wd102.myworkdayjobs.com', site: 'ocbc/External', name: 'OCBC Bank' },
    { host: 'uobgroup.wd3.myworkdayjobs.com', site: 'uobgroup/UOBExternal', name: 'UOB' },
    { host: 'capitaland.wd3.myworkdayjobs.com', site: 'capitaland/CapitaLandGroup', name: 'CapitaLand' },
    { host: 'gxs.wd3.myworkdayjobs.com', site: 'gxs/GX_Bank', name: 'GXS Bank' },
    { host: 'peopleplus.wd3.myworkdayjobs.com', site: 'peopleplus/SCB_Careers', name: 'Standard Chartered Bank' },
    { host: 'prudential.wd3.myworkdayjobs.com', site: 'prudential/prudential', name: 'Prudential plc Asia/Africa' },
    { host: 'hkex.wd3.myworkdayjobs.com', site: 'hkex/HKEXCareerPage', name: 'HKEX (Hong Kong Exchanges)' },
    { host: 'melcoresorts.wd3.myworkdayjobs.com', site: 'melcoresorts/career', name: 'Melco Resorts (Macau)' },
    { host: 'goto.wd5.myworkdayjobs.com', site: 'goto/GoToCareers', name: 'GoTo' },

    // ── Australia / New Zealand ──
    { host: 'mq.wd3.myworkdayjobs.com', site: 'mq/CareersatMQ', name: 'Macquarie Group' },
    { host: 'westpacnz.wd105.myworkdayjobs.com', site: 'westpacnz/Westpac_Careers', name: 'Westpac NZ' },
    { host: 'telstra.wd3.myworkdayjobs.com', site: 'telstra/Telstra_Careers', name: 'Telstra' },
    { host: 'crownresorts.wd3.myworkdayjobs.com', site: 'crownresorts/crown_careers', name: 'Crown Resorts Australia' },
    { host: 'qbe.wd3.myworkdayjobs.com', site: 'qbe/QBE-Careers', name: 'QBE Insurance' },
    { host: 'missionaustralia.wd3.myworkdayjobs.com', site: 'missionaustralia/MissionAustralia', name: 'Mission Australia' },
    { host: 'bunnings.wd3.myworkdayjobs.com', site: 'bunnings/Careers', name: 'Bunnings (Wesfarmers)' },
    { host: 'dowjones.wd1.myworkdayjobs.com', site: 'dowjones/News_Corp_Australia_Careers', name: 'News Corp Australia' },
    { host: 'aristocrat.wd3.myworkdayjobs.com', site: 'aristocrat/AristocratExternalCareersSite', name: 'Aristocrat Leisure' },
    { host: 'lendlease.wd3.myworkdayjobs.com', site: 'lendlease/LendleaseCareers', name: 'Lendlease' },
    { host: 'cochlear.wd3.myworkdayjobs.com', site: 'cochlear/Cochlear_Careers', name: 'Cochlear' },
    { host: 'csl.wd1.myworkdayjobs.com', site: 'csl/CSL_External', name: 'CSL Behring' },
    { host: 'nbn.wd3.myworkdayjobs.com', site: 'nbn/nbncareers', name: 'NBN Co Australia' },
    { host: 'bupa.wd3.myworkdayjobs.com', site: 'bupa/EXT_CAREER', name: 'Bupa' },

    // ── Africa ──
    { host: 'firstrand.wd3.myworkdayjobs.com', site: 'firstrand/FRB', name: 'FirstRand FNB South Africa' },
    { host: 'absa.wd3.myworkdayjobs.com', site: 'absa/ABSAcareersite', name: 'Absa Bank' },
    { host: 'gcaa.wd3.myworkdayjobs.com', site: 'gcaa/GCAA_Careers', name: 'Glencore Coal Australia' },
    { host: 'glencore.wd3.myworkdayjobs.com', site: 'glencore/astronenergy', name: 'Astron Energy' },
    { host: 'picknpay.wd3.myworkdayjobs.com', site: 'picknpay/PNP_Careers', name: 'Pick n Pay' },

    // ── Europe (Nordics / France / Germany / Spain / UK) ──
    { host: 'saabgroup.wd3.myworkdayjobs.com', site: 'saabgroup/Saab_careers', name: 'Saab Group' },
    { host: 'saabgroup.wd3.myworkdayjobs.com', site: 'saabgroup/combitech_careers', name: 'Combitech' },
    { host: 'teliacompany.wd3.myworkdayjobs.com', site: 'teliacompany/Telia_careers', name: 'Telia Company' },
    { host: 'essity.wd3.myworkdayjobs.com', site: 'essity/Job_opportunities', name: 'Essity' },
    { host: 'posti.wd3.myworkdayjobs.com', site: 'posti/external', name: 'Posti Finland' },
    { host: 'if.wd3.myworkdayjobs.com', site: 'if/Careers', name: 'If P&C Insurance' },
    { host: 'eiffage.wd3.myworkdayjobs.com', site: 'eiffage/Eiffage_Careers', name: 'Eiffage' },
    { host: 'mango.wd3.myworkdayjobs.com', site: 'mango/Mango_Work_Your_Passion', name: 'Mango' },
    { host: 'zalando.wd3.myworkdayjobs.com', site: 'zalando/ZalandoSiteWD', name: 'Zalando' },
    { host: 'mercedesbenztechinnovation.wd3.myworkdayjobs.com', site: 'mercedesbenztechinnovation/MBTI_JOBPORTAL', name: 'Mercedes-Benz Tech Innovation' },
    { host: 'capita.wd3.myworkdayjobs.com', site: 'capita/CapitaGlobal', name: 'Capita UK' },
    { host: 'wiley.wd1.myworkdayjobs.com', site: 'wiley/wiley_careers', name: 'Wiley' },

    // ── Big Consulting (PwC, Accenture) ──
    { host: 'pwc.wd3.myworkdayjobs.com', site: 'pwc/Global_Experienced_Careers', name: 'PwC Global Experienced' },
    { host: 'pwc.wd3.myworkdayjobs.com', site: 'pwc/Global_Campus_Careers', name: 'PwC Global Campus' },
    { host: 'accenture.wd103.myworkdayjobs.com', site: 'accenture/AccentureCareers', name: 'Accenture' },
    { host: 'cae.wd3.myworkdayjobs.com', site: 'cae/career', name: 'CAE' },
    { host: 'woodmac.wd3.myworkdayjobs.com', site: 'woodmac/woodmaccareers', name: 'Wood Mackenzie' },

    // ── Hotels / Travel ──
    { host: 'wynd.wd5.myworkdayjobs.com', site: 'wynd/External', name: 'Wyndham Destinations' },
    { host: 'choicehotels.wd5.myworkdayjobs.com', site: 'choicehotels/HotelExternal', name: 'Choice Hotels' },
    { host: 'choicehotels.wd5.myworkdayjobs.com', site: 'choicehotels/External', name: 'Choice Hotels Corporate' },
    { host: 'expedia.wd108.myworkdayjobs.com', site: 'expedia/search', name: 'Expedia Group' },

    // ── Vertical SaaS / Mid-cap Tech ──
    { host: 'procore.wd12.myworkdayjobs.com', site: 'procore/Procore_External_Careers', name: 'Procore' },
    { host: 'workiva.wd503.myworkdayjobs.com', site: 'workiva/careers', name: 'Workiva' },
    { host: 'sprinklr.wd1.myworkdayjobs.com', site: 'sprinklr/careers', name: 'Sprinklr' },
    { host: 'trimble.wd1.myworkdayjobs.com', site: 'trimble/TrimbleCareers', name: 'Trimble' },
    { host: 'collaborative.wd1.myworkdayjobs.com', site: 'collaborative/AllOpenings', name: 'Collaborative Solutions' },
    { host: 'kyndryl.wd5.myworkdayjobs.com', site: 'kyndryl/KyndrylProfessionalCareers', name: 'Kyndryl' },
    { host: 'logitech.wd5.myworkdayjobs.com', site: 'logitech/Logitech', name: 'Logitech' },
    { host: 'silabs.wd1.myworkdayjobs.com', site: 'silabs/SiliconLabsCareers', name: 'Silicon Labs' },
    { host: 'fico.wd1.myworkdayjobs.com', site: 'fico/External', name: 'FICO' },
    { host: 'fiserv.wd5.myworkdayjobs.com', site: 'fiserv/EXT', name: 'Fiserv' },
    { host: 'dtn.wd1.myworkdayjobs.com', site: 'dtn/DTN_Careers', name: 'DTN' },

    // ── Insurance Brokers / Specialty Finance ──
    { host: 'acrisure.wd1.myworkdayjobs.com', site: 'acrisure/Acrisure', name: 'Acrisure' },
    { host: 'hubinternational.wd1.myworkdayjobs.com', site: 'hubinternational/HUBInternational', name: 'HUB International' },
    { host: 'hyperiongrp.wd3.myworkdayjobs.com', site: 'hyperiongrp/Hyperion_External', name: 'Howden Group' },
    { host: 'countryfinancial.wd5.myworkdayjobs.com', site: 'countryfinancial/COUNTRYAgencyExternal', name: 'COUNTRY Financial' },

    // ── Mid-cap & Regional Banks ──
    { host: 'hancockwhitney.wd5.myworkdayjobs.com', site: 'hancockwhitney/Careers', name: 'Hancock Whitney' },
    { host: 'firstnational.wd12.myworkdayjobs.com', site: 'firstnational/fnbocareers', name: 'First National of Nebraska' },
    { host: 'ffin.wd1.myworkdayjobs.com', site: 'ffin/First_Financial_Bank', name: 'First Financial Bankshares' },
    { host: 'bankatfirst.wd1.myworkdayjobs.com', site: 'bankatfirst/FFB', name: 'First Financial Bank Ohio' },
    { host: 'fnbcorp.wd501.myworkdayjobs.com', site: 'fnbcorp/FNBCORP', name: 'F.N.B. Corp' },
    { host: 'westernalliancebank.wd5.myworkdayjobs.com', site: 'westernalliancebank/WAB', name: 'Western Alliance Bancorporation' },
    { host: 'simmonsbank.wd5.myworkdayjobs.com', site: 'simmonsbank/SimmonsCareers', name: 'Simmons Bank' },
    { host: 'associatedbank.wd1.myworkdayjobs.com', site: 'associatedbank/external_careers', name: 'Associated Bank' },
    { host: 'swbc.wd1.myworkdayjobs.com', site: 'swbc/swbccareers', name: 'SWBC' },

    // ── REITs / Property Management ──
    { host: 'brookfield.wd5.myworkdayjobs.com', site: 'brookfield/brookfieldproperties', name: 'Brookfield Properties' },
    { host: 'greystar.wd1.myworkdayjobs.com', site: 'greystar/External', name: 'Greystar' },
    { host: 'avalonbay.wd5.myworkdayjobs.com', site: 'avalonbay/AVBExternal', name: 'AvalonBay Communities' },

    // ── Defense / Government Services ──
    { host: 'leidos.wd5.myworkdayjobs.com', site: 'leidos/External', name: 'Leidos' },
    { host: 'caci.wd1.myworkdayjobs.com', site: 'caci/External', name: 'CACI' },
    { host: 'bah.wd1.myworkdayjobs.com', site: 'bah/BAH_Jobs', name: 'Booz Allen Hamilton' },
    { host: 'blueorigin.wd5.myworkdayjobs.com', site: 'blueorigin/BlueOrigin', name: 'Blue Origin' },

    // ── MedTech / Biotech / Animal Health ──
    { host: 'haemonetics.wd5.myworkdayjobs.com', site: 'haemonetics/HAE', name: 'Haemonetics' },
    { host: 'integralife.wd1.myworkdayjobs.com', site: 'integralife/Careers', name: 'Integra LifeSciences' },
    { host: 'halozyme.wd1.myworkdayjobs.com', site: 'halozyme/halozymecareers', name: 'Halozyme' },
    { host: 'exelixis.wd1.myworkdayjobs.com', site: 'exelixis/Exel', name: 'Exelixis' },
    { host: 'catalent.wd1.myworkdayjobs.com', site: 'catalent/External', name: 'Catalent' },
    { host: 'genmab.wd3.myworkdayjobs.com', site: 'genmab/Genmab_Careers_Site', name: 'Genmab' },
    { host: 'lonza.wd3.myworkdayjobs.com', site: 'lonza/Lonza_Careers', name: 'Lonza' },
    { host: 'idexx.wd1.myworkdayjobs.com', site: 'idexx/IDEXX', name: 'IDEXX' },
    { host: 'zoetis.wd5.myworkdayjobs.com', site: 'zoetis/zoetis', name: 'Zoetis' },
    { host: 'globusmedical.wd5.myworkdayjobs.com', site: 'globusmedical/GMED_Careers', name: 'Globus Medical' },
    { host: 'crisprtx.wd12.myworkdayjobs.com', site: 'crisprtx/careers', name: 'CRISPR Therapeutics' },
    { host: 'neurocrine.wd5.myworkdayjobs.com', site: 'neurocrine/Neurocrinecareers', name: 'Neurocrine Biosciences' },
    { host: 'henryschein.wd1.myworkdayjobs.com', site: 'henryschein/External_Careers', name: 'Henry Schein' },
    { host: 'trimedx.wd1.myworkdayjobs.com', site: 'trimedx/TMX', name: 'TRIMEDX' },

    // ── Chemicals / Materials ──
    { host: 'albemarle.wd5.myworkdayjobs.com', site: 'albemarle/External', name: 'Albemarle' },
    { host: 'mosaic.wd5.myworkdayjobs.com', site: 'mosaic/mosaic', name: 'The Mosaic Company' },
    { host: 'huntsman.wd1.myworkdayjobs.com', site: 'huntsman/Huntsman', name: 'Huntsman' },
    { host: 'chemours.wd103.myworkdayjobs.com', site: 'chemours/Chemours', name: 'Chemours' },
    { host: 'wattswater.wd5.myworkdayjobs.com', site: 'wattswater/External', name: 'Watts Water Technologies' },

    // ── Consumer / Retail / Auto / Industrial ──
    { host: 'cbrands.wd5.myworkdayjobs.com', site: 'cbrands/CBI_External_Careers', name: 'Constellation Brands' },
    { host: 'chipotle.wd5.myworkdayjobs.com', site: 'chipotle/ChipotleCareers', name: 'Chipotle' },
    { host: 'lithia.wd5.myworkdayjobs.com', site: 'lithia/LithiaCareers', name: 'Lithia & Driveway' },
    { host: 'oshkoshcorporation.wd5.myworkdayjobs.com', site: 'oshkoshcorporation/Oshkosh', name: 'Oshkosh Corporation' },
    { host: 'copart.wd12.myworkdayjobs.com', site: 'copart/Copart', name: 'Copart' },
    { host: 'carmax.wd1.myworkdayjobs.com', site: 'carmax/External', name: 'CarMax' },
    { host: 'jabil.wd5.myworkdayjobs.com', site: 'jabil/Jabil_Careers', name: 'Jabil' },
    { host: 'flextronics.wd1.myworkdayjobs.com', site: 'flextronics/Careers', name: 'Flex' },
    { host: 'nascar.wd1.myworkdayjobs.com', site: 'nascar/NASCAR', name: 'NASCAR' },

    // ── Utilities / Waste / Energy ──
    { host: 'atmosenergy.wd5.myworkdayjobs.com', site: 'atmosenergy/External_Career_Site', name: 'Atmos Energy' },
    { host: 'aquaamerica.wd5.myworkdayjobs.com', site: 'aquaamerica/Essential_Careers', name: 'Essential Utilities' },
    { host: 'reworld.wd5.myworkdayjobs.com', site: 'reworld/External', name: 'Reworld (Covanta)' },
    { host: 'republic.wd5.myworkdayjobs.com', site: 'republic/Republic', name: 'Republic Services' },
    { host: 'wasteconnections.wd1.myworkdayjobs.com', site: 'wasteconnections/Careers', name: 'Waste Connections' },
];

const REQUEST_TIMEOUT = 8000;
const PER_TENANT_LIMIT = 20; // Workday silently clamps >20 on most tenants
const CONCURRENCY = 8;

/**
 * Query a single Workday tenant for jobs matching searchText.
 * Supports both URL families:
 *   1. {tenant}.{wdN}.myworkdayjobs.com → host has dots, /wday/cxs/{site}/jobs
 *   2. {wdN}.myworkdaysite.com → /wday/cxs/{site}/jobs (same path structure)
 */
async function queryTenant(tenant, searchText) {
    const url = `https://${tenant.host}/wday/cxs/${tenant.site}/jobs`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                appliedFacets: {},
                limit: PER_TENANT_LIMIT,
                offset: 0,
                searchText: searchText,
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!res.ok) return [];
        const data = await res.json();
        const postings = data.jobPostings || [];

        // Build the apply URL from externalPath. The site path includes the tenant prefix
        // (e.g. "nvidia/NVIDIAExternalCareerSite") — we need just the second part for the URL.
        const sitePathOnly = tenant.site.split('/').slice(1).join('/') || tenant.site;
        const baseUrl = `https://${tenant.host}/${sitePathOnly}`;

        return postings.map(p => ({
            id: p.bulletFields?.[0] || '',
            title: p.title || '',
            company: tenant.name,
            location: p.locationsText || '',
            date_posted: p.postedOn || '',
            apply_url: p.externalPath ? baseUrl + p.externalPath : '',
            source: `Workday (${tenant.name})`,
            summary: '', // Search endpoint doesn't return descriptions — use queryJobDetail() for full JD
        })).filter(j => j.title);
    } catch {
        return [];
    }
}

/**
 * Fetch full job description by externalPath.
 * Returns jobPostingInfo.jobDescription HTML, or null if unavailable.
 * Use sparingly — only when user clicks into a job (not for every search result).
 */
export async function queryJobDetail(tenant, externalPath) {
    const url = `https://${tenant.host}/wday/cxs/${tenant.site}/job${externalPath}`;
    try {
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.jobPostingInfo || null;
    } catch {
        return null;
    }
}

/**
 * Run async tasks with a concurrency limit.
 */
async function runWithConcurrency(tasks, limit) {
    const results = [];
    let idx = 0;
    async function worker() {
        while (idx < tasks.length) {
            const i = idx++;
            try {
                results[i] = await tasks[i]();
            } catch {
                results[i] = [];
            }
        }
    }
    const workers = Array(Math.min(limit, tasks.length)).fill(0).map(worker);
    await Promise.all(workers);
    return results;
}

/**
 * Filter jobs by location relevance (since Workday tenants are global).
 * If user wants India jobs, only return jobs whose locationsText mentions India/Bengaluru/Mumbai/etc.
 */
function filterByLocation(jobs, userLocation, userCountry) {
    if (!userLocation && !userCountry) return jobs;

    const country = (userCountry || '').toLowerCase();
    const city = (userLocation || '').split(',')[0].trim().toLowerCase();

    // Use word-boundary regex to avoid "india" matching "indiana"
    const patterns = [];
    if (city) patterns.push(new RegExp(`\\b${city}\\b`, 'i'));

    if (country === 'in' || country === 'india') {
        // Match India only when it's a standalone word, not part of "indiana"/"indianapolis"
        patterns.push(/\bindia\b/i, /\bbengaluru\b/i, /\bbangalore\b/i, /\bmumbai\b/i,
                      /\bdelhi\b/i, /\bhyderabad\b/i, /\bchennai\b/i, /\bpune\b/i,
                      /\bkolkata\b/i, /\bgurgaon\b/i, /\bgurugram\b/i, /\bnoida\b/i,
                      /\bahmedabad\b/i, /\bkochi\b/i, /\bjaipur\b/i);
    } else if (country === 'us' || country === 'usa') {
        patterns.push(/\busa?\b/i, /\bunited states\b/i, /\bnew york\b/i, /\bcalifornia\b/i,
                      /\btexas\b/i, /\bremote\b/i);
    } else if (country === 'gb' || country === 'uk') {
        patterns.push(/\buk\b/i, /\bunited kingdom\b/i, /\blondon\b/i, /\bengland\b/i);
    }

    if (patterns.length === 0) return jobs;

    return jobs.filter(j => {
        const loc = j.location || '';
        return patterns.some(p => p.test(loc));
    });
}

/**
 * Main fetch function — query all Workday tenants in parallel for the user's queries.
 *
 * @param {string[]} queries - Search query strings (uses first as searchText)
 * @param {string} location - User location string
 * @param {object} preferences - User preferences
 * @returns {Promise<object[]>}
 */
export async function fetchWorkdayPublic(queries, location, preferences = {}) {
    if (!queries || queries.length === 0) return [];

    // Use the first query as the search term — Workday's search is keyword-based and can match titles
    const searchText = typeof queries[0] === 'string' ? queries[0] : (queries[0].q || queries[0]);
    if (!searchText) return [];

    // Build task list — one query per tenant
    const tasks = WORKDAY_TENANTS.map(t => () => queryTenant(t, searchText));

    const allResults = await runWithConcurrency(tasks, CONCURRENCY);
    const allJobs = allResults.flat();

    // Dedup by company + title
    const seen = new Set();
    const unique = [];
    for (const job of allJobs) {
        const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(job);
    }

    // Filter by location relevance
    const filtered = filterByLocation(unique, location, preferences.country);

    return filtered;
}

export { WORKDAY_TENANTS, queryTenant };
