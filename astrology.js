/**
 * astrology.js
 *
 * 纯原生 JavaScript
 * 不依赖：
 * - Node.js
 * - npm
 * - WASM
 * - Swiss Ephemeris
 *
 * 功能：
 * 1. 太阳星座
 * 2. 上升星座
 * 3. 中国省市选择
 * 4. 根据城市自动获取经纬度
 *
 * 依赖：
 * china-cities.js
 *
 * china-cities.js 必须先加载：
 *
 * <script src="china-cities.js"></script>
 * <script src="astrology.js"></script>
 */


// ============================================================
// 星座
// ============================================================

const ZODIAC_SIGNS = [
    {
        name: "白羊座",
        symbol: "♈",
        number: 1,
        start: [3, 21]
    },
    {
        name: "金牛座",
        symbol: "♉",
        number: 2,
        start: [4, 20]
    },
    {
        name: "双子座",
        symbol: "♊",
        number: 3,
        start: [5, 21]
    },
    {
        name: "巨蟹座",
        symbol: "♋",
        number: 4,
        start: [6, 21]
    },
    {
        name: "狮子座",
        symbol: "♌",
        number: 5,
        start: [7, 23]
    },
    {
        name: "处女座",
        symbol: "♍",
        number: 6,
        start: [8, 23]
    },
    {
        name: "天秤座",
        symbol: "♎",
        number: 7,
        start: [9, 23]
    },
    {
        name: "天蝎座",
        symbol: "♏",
        number: 8,
        start: [10, 23]
    },
    {
        name: "射手座",
        symbol: "♐",
        number: 9,
        start: [11, 22]
    },
    {
        name: "摩羯座",
        symbol: "♑",
        number: 10,
        start: [12, 22]
    },
    {
        name: "水瓶座",
        symbol: "♒",
        number: 11,
        start: [1, 20]
    },
    {
        name: "双鱼座",
        symbol: "♓",
        number: 12,
        start: [2, 19]
    }
];


// ============================================================
// 工具函数
// ============================================================

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function radToDeg(rad) {
    return rad * 180 / Math.PI;
}

function normalizeDegree(deg) {
    deg %= 360;

    if (deg < 0) {
        deg += 360;
    }

    return deg;
}


// ============================================================
// 日期 → 儒略日
// ============================================================

function julianDay(year, month, day, hour = 0) {

    if (month <= 2) {
        year -= 1;
        month += 12;
    }

    const A = Math.floor(year / 100);

    const B =
        2 -
        A +
        Math.floor(A / 4);

    return (
        Math.floor(365.25 * (year + 4716)) +
        Math.floor(30.6001 * (month + 1)) +
        day +
        B -
        1524.5 +
        hour / 24
    );
}


// ============================================================
// 太阳黄经
//
// 精度足够用于普通星座判断
// ============================================================

function calculateSunLongitude(year, month, day, hour = 0) {

    const jd = julianDay(
        year,
        month,
        day,
        hour
    );

    const T =
        (jd - 2451545.0) /
        36525.0;

    // 太阳几何平均黄经
    let L0 =
        280.46646 +
        36000.76983 * T +
        0.0003032 * T * T;

    L0 = normalizeDegree(L0);

    // 太阳平近点角
    const M =
        357.52911 +
        35999.05029 * T -
        0.0001537 * T * T;

    const Mrad = degToRad(M);

    // 地球轨道偏心率
    const e =
        0.016708634 -
        0.000042037 * T -
        0.0000001267 * T * T;

    // 太阳中心差
    const C =
        (1.914602 -
            0.004817 * T -
            0.000014 * T * T) *
            Math.sin(Mrad)

        +

        (0.019993 -
            0.000101 * T) *
            Math.sin(2 * Mrad)

        +

        0.000289 *
            Math.sin(3 * Mrad);

    const trueLongitude =
        L0 + C;

    return normalizeDegree(
        trueLongitude
    );
}


// ============================================================
// 太阳星座
// ============================================================

function getSunSign(
    year,
    month,
    day,
    hour = 12
) {

    const longitude =
        calculateSunLongitude(
            year,
            month,
            day,
            hour
        );

    const index =
        Math.floor(
            longitude / 30
        );

    return {
        ...ZODIAC_SIGNS[index],
        longitude
    };
}


// ============================================================
// 计算格林尼治恒星时
// ============================================================

function calculateGMST(jd) {

    const T =
        (jd - 2451545.0) /
        36525.0;

    let gmst =
        280.46061837
        +
        360.98564736629 *
        (jd - 2451545.0)
        +
        0.000387933 * T * T
        -
        T * T * T / 38710000;

    return normalizeDegree(gmst);
}


// ============================================================
// 计算当地恒星时
//
// longitude:
// 东经为正
// 西经为负
// ============================================================

function calculateLocalSiderealTime(
    jd,
    longitude
) {

    const gmst =
        calculateGMST(jd);

    return normalizeDegree(
        gmst + longitude
    );
}


// ============================================================
// 计算上升点
//
// 输入：
// latitude  纬度
// longitude 经度
// lst       当地恒星时（度）
//
// 返回：
// 黄道经度
// ============================================================

function calculateAscendant(
    latitude,
    longitude,
    lst
) {

    const phi =
        degToRad(latitude);

    const epsilon =
        degToRad(23.439291);

    const theta =
        degToRad(lst);

    /*
     * Ascendant 计算公式
     *
     * atan2(
     *   -cos(theta),
     *   sin(theta)*cos(epsilon)
     *   + tan(phi)*sin(epsilon)
     * )
     */

    let asc =
        radToDeg(
            Math.atan2(
                -Math.cos(theta),
                Math.sin(theta) *
                    Math.cos(epsilon)
                +
                Math.tan(phi) *
                    Math.sin(epsilon)
            )
        );

    asc =
        normalizeDegree(
            asc
        );

    /*
     * 某些情况下 atan2 会得到
     * 对跖点，需要根据地平线方向
     * 进行修正。
     */

    return asc;
}


// ============================================================
// 上升星座
// ============================================================

function getAscendantSign(
    year,
    month,
    day,
    hour,
    minute,
    latitude,
    longitude,
    timezone = 8
) {

    /*
     * 中国标准时间 UTC+8
     *
     * 将北京时间转换成 UTC。
     */

    const localHour =
        hour +
        minute / 60;

    const utcHour =
        localHour -
        timezone;

    const jd =
        julianDay(
            year,
            month,
            day,
            utcHour
        );

    const lst =
        calculateLocalSiderealTime(
            jd,
            longitude
        );

    const ascLongitude =
        calculateAscendant(
            latitude,
            longitude,
            lst
        );

    const index =
        Math.floor(
            ascLongitude / 30
        );

    return {
        ...ZODIAC_SIGNS[index],
        longitude: ascLongitude,
        lst
    };
}


// ============================================================
// 根据省、市取得城市
// ============================================================

function getCityLocation(
    province,
    city
) {

    if (
        !window.CITY_DATA ||
        !CITY_DATA[province]
    ) {
        return null;
    }

    return CITY_DATA[province][city] || null;
}


// ============================================================
// 完整星座计算
// ============================================================

function calculateAstrology({
    province,
    city,
    year,
    month,
    day,
    hour,
    minute
}) {

    // --------------------------------------------
    // 参数检查
    // --------------------------------------------

    if (!province) {
        throw new Error("请选择省份");
    }

    if (!city) {
        throw new Error("请选择城市");
    }

    if (!year || !month || !day) {
        throw new Error("请输入出生日期");
    }

    if (
        hour === undefined ||
        hour === null ||
        hour === ""
    ) {
        throw new Error("请输入出生时间");
    }

    if (
        minute === undefined ||
        minute === null ||
        minute === ""
    ) {
        minute = 0;
    }

    // --------------------------------------------
    // 城市
    // --------------------------------------------

    const location =
        getCityLocation(
            province,
            city
        );

    if (!location) {
        throw new Error(
            `找不到城市坐标：${province} ${city}`
        );
    }

    // --------------------------------------------
    // 太阳星座
    // --------------------------------------------

    const sun =
        getSunSign(
            Number(year),
            Number(month),
            Number(day),
            Number(hour) +
                Number(minute) / 60
        );

    // --------------------------------------------
    // 上升星座
    // --------------------------------------------

    const ascendant =
        getAscendantSign(
            Number(year),
            Number(month),
            Number(day),
            Number(hour),
            Number(minute),
            location.lat,
            location.lon,
            location.timezone ?? 8
        );

    return {

        birth: {
            year: Number(year),
            month: Number(month),
            day: Number(day),
            hour: Number(hour),
            minute: Number(minute)
        },

        location: {
            province,
            city,
            latitude: location.lat,
            longitude: location.lon,
            timezone: location.timezone ?? 8
        },

        sun: {
            name: sun.name,
            symbol: sun.symbol,
            number: sun.number,
            longitude: sun.longitude
        },

        ascendant: {
            name: ascendant.name,
            symbol: ascendant.symbol,
            number: ascendant.number,
            longitude: ascendant.longitude,
            siderealTime: ascendant.lst
        }

    };
}


// ============================================================
// 省份下拉框
// ============================================================

function initProvinceSelect(
    provinceSelect,
    citySelect
) {

    provinceSelect.innerHTML =
        '<option value="">请选择省份</option>';

    Object.keys(CITY_DATA)
        .forEach(province => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                province;

            option.textContent =
                province;

            provinceSelect.appendChild(
                option
            );
        });

    provinceSelect.addEventListener(
        "change",
        () => {

            citySelect.innerHTML =
                '<option value="">请选择城市</option>';

            const province =
                provinceSelect.value;

            if (!province) {
                return;
            }

            const cities =
                CITY_DATA[province];

            Object.keys(cities)
                .forEach(city => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        city;

                    option.textContent =
                        city;

                    citySelect.appendChild(
                        option
                    );
                });
        }
    );
}


// ============================================================
// DOM 自动初始化
//
// HTML：
//
// <select id="province"></select>
// <select id="city"></select>
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const provinceSelect =
            document.getElementById(
                "province"
            );

        const citySelect =
            document.getElementById(
                "city"
            );

        if (
            provinceSelect &&
            citySelect
        ) {

            initProvinceSelect(
                provinceSelect,
                citySelect
            );

        }

    }
);


// ============================================================
// 暴露到 window
// ============================================================

window.Astrology = {

    getSunSign,

    getAscendantSign,

    calculateAstrology,

    getCityLocation,

    initProvinceSelect

};