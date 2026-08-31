const ParkingAggregationService = {
  gridSize: 0.00035,

  aggregate(features) {
    const cells = new Map();
    features.forEach(feature => {
      const [longitude, latitude] = feature.geometry.coordinates;
      const properties = feature.properties || {};
      const cellKey = `${Math.floor(longitude / this.gridSize)}:${Math.floor(latitude / this.gridSize)}`;
      const occupied = Number(properties.motorcycle_count || 0) + Number(properties.scooter_count || 0);
      const available = Number(properties.parking_space_count || 0);
      const current = cells.get(cellKey);
      if (!current || occupied + available > current.occupied + current.available) {
        cells.set(cellKey, { longitude, latitude, occupied, available });
      }
    });

    const streets = new Map();
    [...cells.values()].forEach(point => {
      const street = '育樂街';
      const current = streets.get(street) || { street, motorcycleSpaces: 0, points: [] };
      current.motorcycleSpaces += point.occupied + point.available;
      current.points.push(point);
      streets.set(street, current);
    });
    return { points: [...cells.values()], streets: [...streets.values()] };
  },

  clusterForDisplay(features, groupSize = 4) {
    const remaining = features.filter(feature => {
      const properties = feature.properties || {};
      return Number(properties.motorcycle_count || 0) + Number(properties.scooter_count || 0) + Number(properties.parking_space_count || 0) > 0;
    }).map(feature => ({
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1],
      motorcycleSpaces: Number(feature.properties?.motorcycle_count || 0) + Number(feature.properties?.scooter_count || 0) + Number(feature.properties?.parking_space_count || 0)
    }));
    const clusters = [];
    while (remaining.length) {
      const seed = remaining.shift();
      const nearest = remaining.map((point, index) => ({ index, distance: (point.longitude - seed.longitude) ** 2 + (point.latitude - seed.latitude) ** 2 })).sort((a, b) => a.distance - b.distance).slice(0, groupSize - 1).sort((a, b) => b.index - a.index);
      const members = [seed, ...nearest.map(item => remaining.splice(item.index, 1)[0])];
      clusters.push({
        longitude: members.reduce((sum, point) => sum + point.longitude, 0) / members.length,
        latitude: members.reduce((sum, point) => sum + point.latitude, 0) / members.length,
        motorcycleSpaces: members.reduce((sum, point) => sum + point.motorcycleSpaces, 0),
        observationCount: members.length
      });
    }
    return clusters;
  }
};

if (typeof window !== 'undefined') window.ParkingAggregationService = ParkingAggregationService;
