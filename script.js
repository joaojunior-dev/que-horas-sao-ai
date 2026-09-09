// =========================================
// QUE HORAS SÃO AÍ? — v0.2
// Conversor Brasil ↔ Nova Zelândia
// =========================================
//
// Nesta versão:
// - Brasil = Horário de Brasília / São Paulo
// - Nova Zelândia = Auckland
// - As bandeiras são SVGs desenhados no próprio código.
//   Isso evita o problema do Windows mostrar "BR" e "NZ"
//   no lugar dos emojis de bandeira.
// - Usamos timezones IANA, não uma diferença fixa de horas.
//   Assim o horário de verão da Nova Zelândia é considerado.
//

const locations = {
  brazil: {
    name: "Brasil",
    timeZone: "America/Sao_Paulo",
    timeZoneLabel: "Horário de Brasília"
  },

  newZealand: {
    name: "Nova Zelândia",
    timeZone: "Pacific/Auckland",
    timeZoneLabel: "Auckland"
  }
};

let sourceKey = "newZealand";
let targetKey = "brazil";

const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");

const sourceFlag = document.querySelector("#sourceFlag");
const sourceName = document.querySelector("#sourceName");
const sourceTimezoneName = document.querySelector("#sourceTimezoneName");

const targetFlag = document.querySelector("#targetFlag");
const targetName = document.querySelector("#targetName");
const targetTimezoneName = document.querySelector("#targetTimezoneName");

const resultTime = document.querySelector("#resultTime");
const resultDate = document.querySelector("#resultDate");
const resultMessage = document.querySelector("#resultMessage");
const periodIcon = document.querySelector("#periodIcon");

const convertButton = document.querySelector("#convertButton");
const swapButton = document.querySelector("#swapButton");
const nowButton = document.querySelector("#nowButton");


// ---------------------------------------------------------
// Bandeiras em SVG
// ---------------------------------------------------------

function getBrazilFlagSVG() {
  return `
    <svg viewBox="0 0 720 504" role="img" aria-label="Bandeira do Brasil"
         xmlns="http://www.w3.org/2000/svg">
      <rect width="720" height="504" fill="#009B3A"/>
      <path d="M360 60 650 252 360 444 70 252Z" fill="#FFDF00"/>
      <circle cx="360" cy="252" r="105" fill="#002776"/>
      <path d="M270 226c58-17 121-6 180 31"
            fill="none" stroke="#FFFFFF" stroke-width="16"/>
    </svg>
  `;
}

function getNewZealandFlagSVG() {
  return `
    <svg viewBox="0 0 1200 600" role="img" aria-label="Bandeira da Nova Zelândia"
         xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="600" fill="#012169"/>

      <!-- Union Jack simplificado e proporcional no canto superior -->
      <g transform="scale(0.5)">
        <rect width="1200" height="600" fill="#012169"/>
        <path d="M0 0 1200 600M1200 0 0 600"
              stroke="#FFFFFF" stroke-width="120"/>
        <path d="M0 0 1200 600M1200 0 0 600"
              stroke="#C8102E" stroke-width="70"/>
        <path d="M600 0v600M0 300h1200"
              stroke="#FFFFFF" stroke-width="200"/>
        <path d="M600 0v600M0 300h1200"
              stroke="#C8102E" stroke-width="120"/>
      </g>

      <!-- Southern Cross -->
      <g fill="#C8102E" stroke="#FFFFFF" stroke-width="10">
        <polygon points="900,105 913,140 950,141 920,163 930,199 900,178 870,199 880,163 850,141 887,140"/>
        <polygon points="1010,235 1022,267 1056,268 1029,288 1038,321 1010,302 982,321 991,288 964,268 998,267"/>
        <polygon points="835,300 846,330 878,331 853,350 861,381 835,363 809,381 817,350 792,331 824,330"/>
        <polygon points="920,420 931,449 962,450 937,468 945,498 920,481 895,498 903,468 878,450 909,449"/>
      </g>
    </svg>
  `;
}

function getFlagSVG(locationKey) {
  return locationKey === "brazil"
    ? getBrazilFlagSVG()
    : getNewZealandFlagSVG();
}


// ---------------------------------------------------------
// 1. Atualiza país, bandeira e cores
// ---------------------------------------------------------
function updateDirectionUI() {
  const source = locations[sourceKey];
  const target = locations[targetKey];

  sourceFlag.innerHTML = getFlagSVG(sourceKey);
  sourceName.textContent = source.name;
  sourceTimezoneName.textContent = source.timeZoneLabel;

  targetFlag.innerHTML = getFlagSVG(targetKey);
  targetName.textContent = target.name;
  targetTimezoneName.textContent = target.timeZoneLabel;

  document.body.dataset.theme =
    sourceKey === "brazil" ? "brazil" : "new-zealand";
}


// ---------------------------------------------------------
// 2. Retorna as partes da data em determinado fuso
// ---------------------------------------------------------
function getDatePartsInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  const parts = formatter.formatToParts(date);
  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}


// ---------------------------------------------------------
// 3. Descobre o deslocamento UTC de um timezone
// ---------------------------------------------------------
function getTimeZoneOffset(date, timeZone) {
  const parts = getDatePartsInTimeZone(date, timeZone);

  const samePartsAsUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return samePartsAsUTC - date.getTime();
}


// ---------------------------------------------------------
// 4. Transforma a data/hora digitada em um instante real
// ---------------------------------------------------------
function zonedDateTimeToDate(year, month, day, hour, minute, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  let offset = getTimeZoneOffset(new Date(utcGuess), timeZone);
  let timestamp = utcGuess - offset;

  // Segunda passagem para datas próximas a mudanças de DST.
  const correctedOffset = getTimeZoneOffset(new Date(timestamp), timeZone);

  if (correctedOffset !== offset) {
    timestamp = utcGuess - correctedOffset;
  }

  return new Date(timestamp);
}


// ---------------------------------------------------------
// 5. Formata a hora
// ---------------------------------------------------------
function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date);
}


// ---------------------------------------------------------
// 6. Formata a data
// ---------------------------------------------------------
function formatDate(date, timeZone) {
  const text = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);

  return text.charAt(0).toUpperCase() + text.slice(1);
}


// ---------------------------------------------------------
// 7. Retorna período do dia e mensagem amigável
// ---------------------------------------------------------
function getPeriodInfo(date, timeZone, targetName) {
  const { hour } = getDatePartsInTimeZone(date, timeZone);

  if (hour >= 5 && hour < 12) {
    return {
      icon: "🌅",
      message: `No ${targetName === "Brasil" ? "Brasil" : "destino"} será de manhã.`
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      icon: "☀️",
      message: `No ${targetName === "Brasil" ? "Brasil" : "destino"} será de tarde.`
    };
  }

  if (hour >= 18 && hour < 23) {
    return {
      icon: "🌙",
      message: `No ${targetName === "Brasil" ? "Brasil" : "destino"} será de noite.`
    };
  }

  return {
    icon: "🌌",
    message: `No ${targetName === "Brasil" ? "Brasil" : "destino"} será de madrugada.`
  };
}


// ---------------------------------------------------------
// 8. Mostra o resultado
// ---------------------------------------------------------
function showResult(date) {
  const target = locations[targetKey];
  const period = getPeriodInfo(date, target.timeZone, target.name);

  resultTime.textContent = formatTime(date, target.timeZone);
  resultDate.textContent = formatDate(date, target.timeZone);

  // Para NZ, "na Nova Zelândia" soa mais natural.
  if (targetKey === "newZealand") {
    resultMessage.textContent =
      period.message.replace("No destino", "Na Nova Zelândia");
  } else {
    resultMessage.textContent = period.message;
  }

  periodIcon.textContent = period.icon;
}


// ---------------------------------------------------------
// 9. Converte a data e a hora digitadas
// ---------------------------------------------------------
function convertTypedDateTime() {
  if (!dateInput.value || !timeInput.value) {
    resultTime.textContent = "--:--";
    resultDate.textContent = "Preencha o dia e o horário";
    resultMessage.textContent =
      "Precisamos das duas informações para fazer a conversão.";
    periodIcon.textContent = "🙂";
    return;
  }

  const [year, month, day] = dateInput.value.split("-").map(Number);
  const [hour, minute] = timeInput.value.split(":").map(Number);

  const source = locations[sourceKey];

  const instant = zonedDateTimeToDate(
    year,
    month,
    day,
    hour,
    minute,
    source.timeZone
  );

  showResult(instant);
}


// ---------------------------------------------------------
// 10. Preenche os campos com a hora atual na origem
// ---------------------------------------------------------
function fillInputsWithNow() {
  const now = new Date();
  const source = locations[sourceKey];
  const parts = getDatePartsInTimeZone(now, source.timeZone);

  dateInput.value =
    `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

  timeInput.value =
    `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}


// ---------------------------------------------------------
// 11. Mostra a hora atual
// ---------------------------------------------------------
function showNow() {
  fillInputsWithNow();
  showResult(new Date());
}


// ---------------------------------------------------------
// 12. Inverte os países
// ---------------------------------------------------------
function swapCountries() {
  [sourceKey, targetKey] = [targetKey, sourceKey];

  updateDirectionUI();
  fillInputsWithNow();
  showResult(new Date());
}


// Eventos
convertButton.addEventListener("click", convertTypedDateTime);
swapButton.addEventListener("click", swapCountries);
nowButton.addEventListener("click", showNow);

dateInput.addEventListener("change", convertTypedDateTime);
timeInput.addEventListener("change", convertTypedDateTime);


// Estado inicial
updateDirectionUI();
showNow();
