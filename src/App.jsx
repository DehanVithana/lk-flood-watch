// src/App.jsx
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Droplet, TrendingUp, TrendingDown, Clock, MapPin, Info, RefreshCw, Activity, Map as MapIcon } from 'lucide-react';
import { fetchRiverData, calculateFloodRisk, CRITICAL_STATIONS } from './services/dataService';

const App = () => {
  const [riverData, setRiverData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedRiver, setSelectedRiver] = useState('all');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [floodRisk, setFloodRisk] = useState(0);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'map'

  const alertLevels = {
    '🔴 Major Flood': { color: 'bg-red-600', textColor: 'text-red-900', bgLight: 'bg-red-100', borderColor: 'border-red-600', severity: 4 },
    '🟠 Minor Flood': { color: 'bg-orange-600', textColor: 'text-orange-900', bgLight: 'bg-orange-100', borderColor: 'border-orange-600', severity: 3 },
    '🟡 Alert': { color: 'bg-yellow-600', textColor: 'text-yellow-900', bgLight: 'bg-yellow-100', borderColor: 'border-yellow-600', severity: 2 },
    '🟢 Normal': { color: 'bg-green-600', textColor: 'text-green-900', bgLight: 'bg-green-100', borderColor: 'border-green-600', severity: 1 }
  };

  const loadRiverData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);
      
      const data = await fetchRiverData();
      setRiverData(data);
      setLastUpdate(new Date());
      setFloodRisk(calculateFloodRisk(data));
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error loading river data:', err);
      setError('Failed to load river data. Using cached data.');
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRiverData();
    const interval = setInterval(() => loadRiverData(false), 180000); // 3 minutes
    return () => clearInterval(interval);
  }, []);

  const getCriticalStations = () => {
    return riverData.filter(station => station.isCritical);
  };

  const getOtherRiskStations = () => {
    return riverData.filter(station => 
      !station.isCritical &&
      (station.alert === '🔴 Major Flood' || station.alert === '🟠 Minor Flood' || station.alert === '🟡 Alert')
    );
  };

  const getFilteredData = () => {
    if (selectedRiver === 'all') return riverData;
    if (selectedRiver === 'critical') return getCriticalStations();
    if (selectedRiver === 'risk') return getOtherRiskStations();
    return riverData.filter(station => station.river.toLowerCase().includes(selectedRiver.toLowerCase()));
  };

  const getAlertCount = (alertType) => {
    return riverData.filter(station => station.alert === alertType).length;
  };

  const getRiskColor = (risk) => {
    if (risk >= 75) return 'text-red-600';
    if (risk >= 50) return 'text-orange-600';
    if (risk >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  const StationCard = ({ station }) => {
    const alertStyle = alertLevels[station.alert] || alertLevels['🟢 Normal'];
    const isCritical = station.isCritical;
    const timestamp = new Date(station.lastMeasured);
    const hoursAgo = Math.floor((new Date() - timestamp) / (1000 * 60 * 60));
    const isStale = hoursAgo > 24;

    return (
      <div className={`${alertStyle.bgLight} border-l-4 ${alertStyle.borderColor} p-5 rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-xl text-gray-900">{station.station}</h3>
              {isCritical && (
                <span className="bg-purple-700 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                  CRITICAL
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 flex items-center gap-1 font-medium">
              <Droplet className="w-4 h-4 text-blue-600" />
              {station.river}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg text-sm font-bold ${alertStyle.color} text-white shadow-sm`}>
            {station.alert.replace(/[🔴🟠🟡🟢]\s/, '')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Water Level</p>
            <p className="text-3xl font-bold text-gray-900">{station.level.toFixed(2)}<span className="text-lg text-gray-600">m</span></p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Rate of Change</p>
            <div className="flex items-center gap-1">
              {station.rising ? (
                <TrendingUp className="w-6 h-6 text-red-700" />
              ) : (
                <TrendingDown className="w-6 h-6 text-green-700" />
              )}
              <p className={`text-xl font-bold ${station.rising ? 'text-red-700' : 'text-green-700'}`}>
                {Math.abs(station.rateOfRise).toFixed(3)}<span className="text-sm"> m/hr</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-700 border-t border-gray-300 pt-3 mt-3">
          <div className="flex items-center gap-1 font-medium">
            <Clock className="w-4 h-4 text-gray-600" />
            <span>
              {timestamp.toLocaleString('en-GB', { 
                day: '2-digit', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
              {isStale && <span className="text-orange-700 font-bold ml-1">(⌛ Stale)</span>}
            </span>
          </div>
          <a 
            href={`https://www.google.com/maps/place/${station.coordinates.lat},${station.coordinates.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-700 hover:text-blue-900 hover:underline font-semibold"
          >
            <MapPin className="w-4 h-4" />
            View Map
          </a>
        </div>
      </div>
    );
  };

  const MapView = () => {
    const filteredStations = getFilteredData();
    const center = { lat: 7.8731, lng: 80.7718 }; // Sri Lanka center
    
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-gray-800 text-white p-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Interactive Map - {filteredStations.length} Stations
          </h3>
          <p className="text-sm text-gray-300 mt-1">Click markers to view station details</p>
        </div>
        
        {/* Google Maps Embed */}
        <div className="relative" style={{ height: '600px' }}>
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&center=${center.lat},${center.lng}&zoom=7`}
          />
          
          {/* Overlay with station markers */}
          <div className="absolute inset-0 pointer-events-none">
            {filteredStations.map((station, idx) => {
              const alertStyle = alertLevels[station.alert] || alertLevels['🟢 Normal'];
              // Calculate position (this is approximate - for exact positioning, use proper Maps API)
              const relativeY = ((7.8731 - station.coordinates.lat) * 50) + 50; // Rough calculation
              const relativeX = ((station.coordinates.lng - 80.7718) * 50) + 50;
              
              return (
                <div
                  key={idx}
                  className="absolute pointer-events-auto"
                  style={{
                    top: `${relativeY}%`,
                    left: `${relativeX}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={`${station.station} - ${station.alert}`}
                >
                  <a
                    href={`https://www.google.com/maps/place/${station.coordinates.lat},${station.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-6 h-6 rounded-full ${alertStyle.color} border-2 border-white shadow-lg hover:scale-125 transition-transform`}
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Station List Below Map */}
        <div className="p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <h4 className="font-bold text-gray-900 mb-3">Station Details</h4>
          <div className="space-y-2">
            {filteredStations.map((station, idx) => {
              const alertStyle = alertLevels[station.alert] || alertLevels['🟢 Normal'];
              return (
                <a
                  key={idx}
                  href={`https://www.google.com/maps/place/${station.coordinates.lat},${station.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block p-3 rounded-lg ${alertStyle.bgLight} border ${alertStyle.borderColor} hover:shadow-md transition-shadow`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-900">{station.station}</p>
                      <p className="text-sm text-gray-700">{station.river}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{station.level.toFixed(2)}m</p>
                      <p className={`text-xs font-semibold ${alertStyle.textColor}`}>
                        {station.alert.replace(/[🔴🟠🟡🟢]\s/, '')}
                      </p>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <Droplet className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-bounce" />
          <p className="text-xl text-gray-600">Loading river data...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching latest water levels</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Droplet className="w-10 h-10" />
                Sri Lanka Flood Monitoring
              </h1>
              <p className="text-blue-100 mt-1">Real-time river water levels and flood alerts</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Flood Risk Indicator */}
              <div className="text-right">
                <p className="text-xs text-blue-100 uppercase">Overall Risk</p>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <span className={`text-2xl font-bold ${getRiskColor(floodRisk)}`}>
                    {floodRisk}%
                  </span>
                </div>
              </div>
              
              {/* Last Update */}
              <div className="text-right">
                <p className="text-xs text-blue-100 uppercase">Last Updated</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {lastUpdate?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <button
                    onClick={() => loadRiverData(true)}
                    disabled={refreshing}
                    className="p-1 hover:bg-blue-700 rounded transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Error Banner */}
          {error && (
            <div className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Alert Summary */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-600 text-white p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-red-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold mb-1">Major Flood</p>
                <p className="text-4xl font-bold">{getAlertCount('🔴 Major Flood')}</p>
              </div>
              <AlertTriangle className="w-14 h-14 opacity-90" />
            </div>
          </div>
          <div className="bg-orange-600 text-white p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-orange-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold mb-1">Minor Flood</p>
                <p className="text-4xl font-bold">{getAlertCount('🟠 Minor Flood')}</p>
              </div>
              <AlertTriangle className="w-14 h-14 opacity-90" />
            </div>
          </div>
          <div className="bg-yellow-600 text-white p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-yellow-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold mb-1">Alert</p>
                <p className="text-4xl font-bold">{getAlertCount('🟡 Alert')}</p>
              </div>
              <AlertTriangle className="w-14 h-14 opacity-90" />
            </div>
          </div>
          <div className="bg-green-600 text-white p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-green-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold mb-1">Normal</p>
                <p className="text-4xl font-bold">{getAlertCount('🟢 Normal')}</p>
              </div>
              <Droplet className="w-14 h-14 opacity-90" />
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white p-5 rounded-lg shadow-md mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-gray-700">Filter Stations:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Card View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                  viewMode === 'map'
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                Map View
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedRiver('all')}
              className={`px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm ${
                selectedRiver === 'all' 
                  ? 'bg-blue-700 text-white shadow-md scale-105' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              All Stations ({riverData.length})
            </button>
            <button
              onClick={() => setSelectedRiver('critical')}
              className={`px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm ${
                selectedRiver === 'critical' 
                  ? 'bg-purple-700 text-white shadow-md scale-105' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Critical Stations ({getCriticalStations().length})
            </button>
            <button
              onClick={() => setSelectedRiver('risk')}
              className={`px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm ${
                selectedRiver === 'risk' 
                  ? 'bg-orange-700 text-white shadow-md scale-105' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Risk Zones ({getOtherRiskStations().length})
            </button>
            <button
              onClick={() => setSelectedRiver('kelani')}
              className={`px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm ${
                selectedRiver === 'kelani' 
                  ? 'bg-blue-700 text-white shadow-md scale-105' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Kelani River
            </button>
            <button
              onClick={() => setSelectedRiver('mahaweli')}
              className={`px-5 py-2.5 rounded-lg font-bold transition-all shadow-sm ${
                selectedRiver === 'mahaweli' 
                  ? 'bg-blue-700 text-white shadow-md scale-105' 
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Mahaweli River
            </button>
          </div>
        </div>

        {/* Map View */}
        {viewMode === 'map' && (
          <div className="mb-8">
            <MapView />
          </div>
        )}

        {/* Critical Stations Section */}
        {viewMode === 'cards' && (selectedRiver === 'all' || selectedRiver === 'critical') && getCriticalStations().length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5 bg-purple-100 p-4 rounded-lg border-l-4 border-purple-700">
              <AlertTriangle className="w-7 h-7 text-purple-700" />
              <h2 className="text-2xl font-bold text-gray-900">Critical Gauging Stations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {getCriticalStations().map((station, idx) => (
                <StationCard key={idx} station={station} />
              ))}
            </div>
          </div>
        )}

        {/* Other Risk Zones */}
        {viewMode === 'cards' && (selectedRiver === 'all' || selectedRiver === 'risk') && getOtherRiskStations().length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5 bg-orange-100 p-4 rounded-lg border-l-4 border-orange-700">
              <Info className="w-7 h-7 text-orange-700" />
              <h2 className="text-2xl font-bold text-gray-900">Other Risk Zones</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {getOtherRiskStations().map((station, idx) => (
                <StationCard key={idx} station={station} />
              ))}
            </div>
          </div>
        )}

        {/* All Stations */}
        {viewMode === 'cards' && selectedRiver !== 'critical' && selectedRiver !== 'risk' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-5 bg-blue-100 p-4 rounded-lg border-l-4 border-blue-700">
              {selectedRiver === 'all' ? 'All Monitoring Stations' : `${selectedRiver.charAt(0).toUpperCase() + selectedRiver.slice(1)} River Stations`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {getFilteredData().map((station, idx) => (
                <StationCard key={idx} station={station} />
              ))}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {getFilteredData().length === 0 && (
          <div className="text-center py-12">
            <Droplet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">No stations found for this filter</p>
            <button
              onClick={() => setSelectedRiver('all')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View All Stations
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-4">
            <p className="text-sm">
              Data Source: <a href="https://github.com/nuuuwan/lk_irrigation" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                Sri Lanka Irrigation Department
              </a> via <a href="https://github.com/nuuuwan/lk_dmc_vis" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                lk_dmc_vis
              </a>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Updates every 3 minutes • For emergencies, contact Disaster Management Centre at <strong>117</strong>
            </p>
          </div>
          <div className="text-center text-xs text-gray-500">
            <p>Built with React • Deployed on GitHub Pages & Vercel</p>
            <p className="mt-1">Monitoring {riverData.length} stations across Sri Lanka</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
