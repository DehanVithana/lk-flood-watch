// src/services/dataService.js
// Enhanced data service with real-time API integration

// Data sources from nuuuwan's repositories
const DATA_SOURCES = {
  irrigation: 'https://raw.githubusercontent.com/nuuuwan/lk_irrigation/main/data/rwlds/latest.json',
  dmc: 'https://raw.githubusercontent.com/nuuuwan/lk_dmc_vis/main/data/latest.json',
  fallback: 'https://api.github.com/repos/nuuuwan/lk_irrigation/contents/data/rwlds'
};

// Critical stations configuration
const CRITICAL_STATIONS = {
  'Nagalagam Street': { river: 'Kelani Ganga', lat: 6.96027, lng: 79.87858, priority: 1 },
  'Peradeniya': { river: 'Mahaweli Ganga', lat: 7.26417, lng: 80.59362, priority: 1 },
  'Moragaswewa': { river: 'Deduru Oya', lat: 7.73187, lng: 80.24296, priority: 1 },
  'Thanthirimale': { river: 'Malwathu Oya', lat: 8.58076, lng: 80.28401, priority: 1 }
};

// Alert thresholds (meters) - adjust based on historical data
const ALERT_THRESHOLDS = {
  'Nagalagam Street': { major: 2.4, minor: 2.0, alert: 1.6 },
  'Peradeniya': { major: 8.0, minor: 6.5, alert: 5.5 },
  'Moragaswewa': { major: 7.5, minor: 6.0, alert: 5.0 },
  'Thanthirimale': { major: 9.0, minor: 7.5, alert: 6.5 },
  'Hanwella': { major: 9.0, minor: 7.5, alert: 6.5 },
  'Glencourse': { major: 15.0, minor: 13.5, alert: 12.0 },
  'Rathnapura': { major: 7.0, minor: 5.5, alert: 4.5 },
  'Kalawellawa': { major: 8.0, minor: 6.5, alert: 5.5 },
  'default': { major: 10.0, minor: 7.5, alert: 5.0 }
};

/**
 * Fetch river data from multiple sources with fallback
 */
export const fetchRiverData = async () => {
  try {
    // Try primary source (lk_irrigation)
    let data = await fetchFromSource(DATA_SOURCES.irrigation);
    
    if (!data || data.length === 0) {
      console.warn('Primary source unavailable, trying DMC source...');
      data = await fetchFromSource(DATA_SOURCES.dmc);
    }
    
    if (!data || data.length === 0) {
      console.warn('All sources unavailable, using sample data...');
      return getSampleData();
    }
    
    return parseRiverData(data);
  } catch (error) {
    console.error('Error fetching river data:', error);
    return getSampleData();
  }
};

/**
 * Fetch data from a specific source
 */
const fetchFromSource = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
};

/**
 * Parse raw river data into standardized format
 */
const parseRiverData = (rawData) => {
  if (!rawData) return [];
  
  // Handle different data structures
  let stations = [];
  
  if (Array.isArray(rawData)) {
    stations = rawData;
  } else if (rawData.stations) {
    stations = rawData.stations;
  } else if (rawData.data) {
    stations = rawData.data;
  }
  
  return stations.map(station => {
    const stationName = getStationName(station);
    const riverName = getRiverName(station);
    const level = getWaterLevel(station);
    const coordinates = getCoordinates(station, stationName);
    const timestamp = getTimestamp(station);
    const rateOfRise = getRateOfRise(station);
    
    return {
      station: stationName,
      river: riverName,
      level: level,
      alert: determineAlertLevel(stationName, level),
      rateOfRise: rateOfRise,
      rising: rateOfRise > 0.001, // Threshold to avoid noise
      lastMeasured: timestamp,
      coordinates: coordinates,
      isCritical: CRITICAL_STATIONS.hasOwnProperty(stationName)
    };
  }).filter(station => station.level !== null);
};

/**
 * Extract station name from various data formats
 */
const getStationName = (station) => {
  return station.station_name || 
         station.station || 
         station.name || 
         station.Station || 
         'Unknown Station';
};

/**
 * Extract river name from various data formats
 */
const getRiverName = (station) => {
  return station.river_basin || 
         station.river || 
         station.basin || 
         station.River || 
         CRITICAL_STATIONS[getStationName(station)]?.river || 
         'Unknown River';
};

/**
 * Extract water level from various data formats
 */
const getWaterLevel = (station) => {
  const level = station.level_m || 
                station.level || 
                station.water_level || 
                station.Level || 
                null;
  return level !== null ? parseFloat(level) : null;
};

/**
 * Get coordinates for station
 */
const getCoordinates = (station, stationName) => {
  // Try from data first
  if (station.latitude && station.longitude) {
    return {
      lat: parseFloat(station.latitude),
      lng: parseFloat(station.longitude)
    };
  }
  
  // Fallback to critical stations database
  if (CRITICAL_STATIONS[stationName]) {
    return {
      lat: CRITICAL_STATIONS[stationName].lat,
      lng: CRITICAL_STATIONS[stationName].lng
    };
  }
  
  // Default to Sri Lanka center
  return { lat: 7.8731, lng: 80.7718 };
};

/**
 * Get timestamp from station data
 */
const getTimestamp = (station) => {
  return station.measured_at || 
         station.timestamp || 
         station.time || 
         station.Timestamp || 
         new Date().toISOString();
};

/**
 * Get rate of rise from station data
 */
const getRateOfRise = (station) => {
  const rate = station.rate_of_rise || 
               station.rate || 
               station.change_rate || 
               0;
  return parseFloat(rate);
};

/**
 * Determine alert level based on water level and thresholds
 */
const determineAlertLevel = (stationName, level) => {
  const thresholds = ALERT_THRESHOLDS[stationName] || ALERT_THRESHOLDS.default;
  
  if (level >= thresholds.major) return '🔴 Major Flood';
  if (level >= thresholds.minor) return '🟠 Minor Flood';
  if (level >= thresholds.alert) return '🟡 Alert';
  return '🟢 Normal';
};

/**
 * Get sample data for fallback/testing
 */
const getSampleData = () => {
  return [
    {
      station: 'Nagalagam Street',
      river: 'Kelani Ganga',
      level: 2.56,
      alert: '🔴 Major Flood',
      rateOfRise: 0.015,
      rising: true,
      lastMeasured: new Date().toISOString(),
      coordinates: { lat: 6.96027, lng: 79.87858 },
      isCritical: true
    },
    {
      station: 'Peradeniya',
      river: 'Mahaweli Ganga',
      level: 10.56,
      alert: '🔴 Major Flood',
      rateOfRise: 0.595,
      rising: true,
      lastMeasured: new Date().toISOString(),
      coordinates: { lat: 7.26417, lng: 80.59362 },
      isCritical: true
    },
    {
      station: 'Moragaswewa',
      river: 'Deduru Oya',
      level: 8.33,
      alert: '🔴 Major Flood',
      rateOfRise: 0.051,
      rising: true,
      lastMeasured: new Date().toISOString(),
      coordinates: { lat: 7.73187, lng: 80.24296 },
      isCritical: true
    },
    {
      station: 'Thanthirimale',
      river: 'Malwathu Oya',
      level: 10.64,
      alert: '🔴 Major Flood',
      rateOfRise: -0.033,
      rising: false,
      lastMeasured: new Date().toISOString(),
      coordinates: { lat: 8.58076, lng: 80.28401 },
      isCritical: true
    },
    {
      station: 'Hanwella',
      river: 'Kelani Ganga',
      level: 9.69,
      alert: '🟠 Minor Flood',
      rateOfRise: -0.087,
      rising: false,
      lastMeasured: new Date().toISOString(),
      coordinates: { lat: 6.91049, lng: 80.08134 },
      isCritical: false
    },
    {
      station: 'Glencourse',
      river: 'Kelani Ganga',
      level: 13.58,
      alert: '🟢 Normal',
      rateOfRise: -0.190,
      rising: false,
      lastMeasured: new Date().toISOString(),
      coordinates: { lat: 6.97574, lng: 80.18661 },
      isCritical: false
    },
    {
      station: 'Rathnapura',
      river: 'Kalu Ganga',
      level: 5.82,
      alert: '🟡 Alert',
      rateOfRise: -0.059,
      rising: false,
      lastMeasured: new Date().toISOString(),
      coordinates: { lat: 6.68986, lng: 80.38028 },
      isCritical: false
    },
    {
      station: 'Kalawellawa',
      river: 'Kalu Ganga',
      level: 7.38,
      alert: '🟠 Minor Flood',
      rateOfRise: -0.051,
      rising: false,
      lastMeasured: new Date().toISOString(),
      coordinates: { lat: 6.63151, lng: 80.16073 },
      isCritical: false
    }
  ];
};

/**
 * Get historical data for a station (for trend analysis)
 */
export const fetchHistoricalData = async (stationName, hours = 24) => {
  try {
    const url = `https://api.github.com/repos/nuuuwan/lk_irrigation/contents/data/rwlds`;
    const response = await fetch(url);
    const files = await response.json();
    
    // Get recent files
    const recentFiles = files
      .filter(f => f.name.endsWith('.json'))
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, Math.ceil(hours / 3)); // Assuming 3-hour intervals
    
    const historicalData = [];
    for (const file of recentFiles) {
      const data = await fetchFromSource(file.download_url);
      if (data) {
        const station = parseRiverData(data).find(s => s.station === stationName);
        if (station) {
          historicalData.push(station);
        }
      }
    }
    
    return historicalData;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
};

/**
 * Get flood risk score (0-100)
 */
export const calculateFloodRisk = (stations) => {
  if (!stations || stations.length === 0) return 0;
  
  let totalRisk = 0;
  let criticalStationRisk = 0;
  
  stations.forEach(station => {
    let risk = 0;
    
    // Alert level contributes most
    if (station.alert.includes('Major')) risk += 40;
    else if (station.alert.includes('Minor')) risk += 25;
    else if (station.alert.includes('Alert')) risk += 10;
    
    // Rising water adds risk
    if (station.rising && station.rateOfRise > 0.05) risk += 20;
    else if (station.rising) risk += 10;
    
    // Critical stations have higher weight
    if (station.isCritical) {
      criticalStationRisk += risk * 2;
    }
    
    totalRisk += risk;
  });
  
  // Average risk with emphasis on critical stations
  const overallRisk = Math.min(100, (totalRisk + criticalStationRisk) / (stations.length + 4));
  return Math.round(overallRisk);
};

export default {
  fetchRiverData,
  fetchHistoricalData,
  calculateFloodRisk,
  CRITICAL_STATIONS,
  ALERT_THRESHOLDS
};
