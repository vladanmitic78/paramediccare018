import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { sr } from 'date-fns/locale';
import { 
  Search, 
  Calendar, 
  Truck, 
  Users, 
  Clock, 
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Video,
  User,
  Filter
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const FleetHistory = ({ language = 'sr' }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await axios.get(`${API}/api/fleet/history`);
      setHistory(response.data);
      if (isRefresh) toast.success(language === 'sr' ? 'Osveženo!' : 'Refreshed!');
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error(language === 'sr' ? 'Greška pri učitavanju istorije' : 'Error loading history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRefresh = () => {
    fetchHistory(true);
  };

  const toggleRowExpand = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const viewDetails = (entry) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: sr });
    } catch {
      return dateString;
    }
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffMs = endDate - startDate;
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${mins}m`;
    } catch {
      return 'N/A';
    }
  };

  const getRoleBadge = (role, isRemote) => {
    const roleColors = {
      driver: 'bg-amber-100 text-amber-800',
      nurse: 'bg-pink-100 text-pink-800',
      doctor: 'bg-sky-100 text-sky-800',
      remote_doctor: 'bg-indigo-100 text-indigo-800'
    };
    
    const roleLabels = {
      driver: language === 'sr' ? 'Vozač' : 'Driver',
      nurse: language === 'sr' ? 'Sestra' : 'Nurse',
      doctor: language === 'sr' ? 'Lekar' : 'Doctor',
      remote_doctor: language === 'sr' ? 'Lekar (daljinski)' : 'Doctor (Remote)'
    };

    const displayRole = isRemote && role === 'doctor' ? 'remote_doctor' : role;
    
    return (
      <Badge className={`${roleColors[displayRole] || 'bg-slate-100'} text-xs`}>
        {isRemote && <Video className="w-3 h-3 mr-1" />}
        {roleLabels[displayRole] || role}
      </Badge>
    );
  };

  // Filter history based on search query
  const filteredHistory = history.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.vehicle_name?.toLowerCase().includes(query) ||
      entry.vehicle_registration?.toLowerCase().includes(query) ||
      entry.mission_id?.toLowerCase().includes(query) ||
      entry.ended_by_name?.toLowerCase().includes(query) ||
      entry.team?.some(m => m.user_name?.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="fleet-history">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {language === 'sr' ? 'Istorija misija' : 'Mission History'}
          </h2>
          <p className="text-sm text-slate-500">
            {language === 'sr' 
              ? `${filteredHistory.length} završenih misija`
              : `${filteredHistory.length} completed missions`}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="refresh-history-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {language === 'sr' ? 'Osveži' : 'Refresh'}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder={language === 'sr' 
            ? 'Pretraži po vozilu, registraciji, članu tima...' 
            : 'Search by vehicle, registration, team member...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="history-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        )}
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">
              {searchQuery 
                ? (language === 'sr' ? 'Nema rezultata pretrage' : 'No search results')
                : (language === 'sr' ? 'Nema završenih misija' : 'No completed missions')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-600">
            <div className="col-span-2">{language === 'sr' ? 'Vozilo' : 'Vehicle'}</div>
            <div className="col-span-2">{language === 'sr' ? 'Registracija' : 'Registration'}</div>
            <div className="col-span-3">{language === 'sr' ? 'Tim' : 'Team'}</div>
            <div className="col-span-2">{language === 'sr' ? 'Početak' : 'Started'}</div>
            <div className="col-span-2">{language === 'sr' ? 'Završetak' : 'Ended'}</div>
            <div className="col-span-1">{language === 'sr' ? 'Trajanje' : 'Duration'}</div>
          </div>

          {/* History Rows */}
          {filteredHistory.map((entry) => (
            <Card 
              key={entry.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              data-testid={`history-entry-${entry.id}`}
            >
              <CardContent className="p-0">
                {/* Desktop View */}
                <div 
                  className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 items-center"
                  onClick={() => toggleRowExpand(entry.id)}
                >
                  <div className="col-span-2 font-medium flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-600" />
                    {entry.vehicle_name}
                  </div>
                  <div className="col-span-2 text-slate-600">
                    {entry.vehicle_registration}
                  </div>
                  <div className="col-span-3">
                    <div className="flex flex-wrap gap-1">
                      {entry.team?.slice(0, 2).map((member, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {member.user_name?.split(' ')[0]}
                        </Badge>
                      ))}
                      {entry.team?.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{entry.team.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">
                    {formatDate(entry.started_at)}
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">
                    {formatDate(entry.ended_at)}
                  </div>
                  <div className="col-span-1 flex items-center justify-between">
                    <Badge className="bg-emerald-100 text-emerald-800">
                      {calculateDuration(entry.started_at, entry.ended_at)}
                    </Badge>
                    {expandedRows[entry.id] ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Mobile View */}
                <div 
                  className="md:hidden p-4"
                  onClick={() => toggleRowExpand(entry.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-sky-600" />
                      <span className="font-medium">{entry.vehicle_name}</span>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800">
                      {calculateDuration(entry.started_at, entry.ended_at)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{entry.vehicle_registration}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(entry.ended_at)}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRows[entry.id] && (
                  <div className="border-t bg-slate-50 px-4 py-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">
                          {language === 'sr' ? 'Tim' : 'Team'}
                        </p>
                        <div className="space-y-2">
                          {entry.team?.map((member, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-sm">{member.user_name}</span>
                              {getRoleBadge(member.role, member.is_remote)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">
                          {language === 'sr' ? 'Detalji' : 'Details'}
                        </p>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-slate-500">
                              {language === 'sr' ? 'ID misije: ' : 'Mission ID: '}
                            </span>
                            {entry.mission_id || 'N/A'}
                          </p>
                          <p>
                            <span className="text-slate-500">
                              {language === 'sr' ? 'Završio: ' : 'Ended by: '}
                            </span>
                            {entry.ended_by_name}
                          </p>
                          {entry.notes && (
                            <p>
                              <span className="text-slate-500">
                                {language === 'sr' ? 'Napomene: ' : 'Notes: '}
                              </span>
                              {entry.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-end">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewDetails(entry);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {language === 'sr' ? 'Puni detalji' : 'Full Details'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === 'sr' ? 'Detalji misije' : 'Mission Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              {/* Vehicle Info */}
              <div className="bg-sky-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Truck className="w-8 h-8 text-sky-600" />
                  <div>
                    <h3 className="font-semibold text-lg">{selectedEntry.vehicle_name}</h3>
                    <p className="text-slate-600">{selectedEntry.vehicle_registration}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">
                    {language === 'sr' ? 'Početak misije' : 'Mission Start'}
                  </p>
                  <p className="font-medium">{formatDate(selectedEntry.started_at)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">
                    {language === 'sr' ? 'Završetak misije' : 'Mission End'}
                  </p>
                  <p className="font-medium">{formatDate(selectedEntry.ended_at)}</p>
                </div>
              </div>

              {/* Duration */}
              <div className="text-center py-2">
                <Badge className="bg-sky-100 text-sky-800 text-lg px-4 py-1">
                  <Clock className="w-4 h-4 mr-2" />
                  {language === 'sr' ? 'Trajanje: ' : 'Duration: '}
                  {calculateDuration(selectedEntry.started_at, selectedEntry.ended_at)}
                </Badge>
              </div>

              {/* Team */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {language === 'sr' ? 'Tim' : 'Team'}
                </h4>
                <div className="space-y-2">
                  {selectedEntry.team?.map((member, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between bg-slate-50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{member.user_name}</span>
                      </div>
                      {getRoleBadge(member.role, member.is_remote)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div className="border-t pt-4 text-sm text-slate-600">
                <p>
                  <strong>{language === 'sr' ? 'ID misije:' : 'Mission ID:'}</strong>{' '}
                  {selectedEntry.mission_id || 'N/A'}
                </p>
                <p>
                  <strong>{language === 'sr' ? 'Završio:' : 'Ended by:'}</strong>{' '}
                  {selectedEntry.ended_by_name}
                </p>
                {selectedEntry.notes && (
                  <p>
                    <strong>{language === 'sr' ? 'Napomene:' : 'Notes:'}</strong>{' '}
                    {selectedEntry.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetHistory;
