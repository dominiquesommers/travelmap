//
// class Spline {
//   constructor(controlPoints, interpolationsPerSplineSegment) {
//   }
// }


const bSpline = (t, degree, points, knots, weights) => {
  const n = points.length // points count
  const d = points[0].length // point dimensionality

  if ((t < 0) || (t > 1)) {
    throw new Error('t out of bounds [0,1]: ' + t)
  }
  if (degree < 1) throw new Error('degree must be at least 1 (linear)')
  if (degree > (n - 1)) throw new Error('degree must be less than or equal to point count - 1')

  if (!weights) {
    // build weight vector of length [n]
    weights = []
    for (let i = 0; i < n; i++) {
      weights[i] = 1
    }
  }

  if (!knots) {
    // build knot vector of length [n + degree + 1]
    knots = []
    for (let i = 0; i < n + degree + 1; i++) {
      knots[i] = i
    }
  } else {
    if (knots.length !== n + degree + 1) throw new Error('bad knot vector length')
  }

  const domain = [
    degree,
    knots.length - 1 - degree
  ]

  // remap t to the domain where the spline is defined
  const low = knots[domain[0]]
  const high = knots[domain[1]]
  t = t * (high - low) + low

  // Clamp to the upper &  lower bounds instead of
  // throwing an error like in the original lib
  // https://github.com/bjnortier/dxf/issues/28
  t = Math.max(t, low)
  t = Math.min(t, high)

  // find s (the spline segment) for the [t] value provided
  let s
  for (s = domain[0]; s < domain[1]; s++) {
    if (t >= knots[s] && t <= knots[s + 1]) {
      break
    }
  }

  // convert points to homogeneous coordinates
  const v = []
  for (let i = 0; i < n; i++) {
    v[i] = []
    for (let j = 0; j < d; j++) {
      v[i][j] = points[i][j] * weights[i]
    }
    v[i][d] = weights[i]
  }

  // l (level) goes from 1 to the curve degree + 1
  let alpha
  for (let l = 1; l <= degree + 1; l++) {
    // build level l of the pyramid
    for (let i = s; i > s - degree - 1 + l; i--) {
      alpha = (t - knots[i]) / (knots[i + degree + 1 - l] - knots[i])

      // interpolate each component
      for (let j = 0; j < d + 1; j++) {
        v[i][j] = (1 - alpha) * v[i - 1][j] + alpha * v[i][j]
      }
    }
  }

  // convert back to cartesian and return
  const result = []
  for (let i = 0; i < d; i++) {
    result[i] = v[s][i] / v[s][d]
  }
  return result
}

const interpolateBSpline = (controlPoints, interpolationsPerSplineSegment) => {
  const degree = 2;
  const polyline = []
  const controlPointsForLib = controlPoints.map(function (p) {
    return [p[0], p[1]]
  })

  const n = controlPoints.length
  // build knot vector of length [n + degree + 1]
  const knots = [0, 0];
  for (let i = 0; i <= n - degree; i++) {
    knots.push(i);
  }
  knots.push(knots[knots.length - 1]);
  knots.push(knots[knots.length - 1]);

  const segmentTs = [knots[degree]]
  const domain = [knots[degree], knots[knots.length - 1 - degree]]

  for (let k = degree + 1; k < knots.length - degree; ++k) {
    if (segmentTs[segmentTs.length - 1] !== knots[k]) {
      segmentTs.push(knots[k])
    }
  }

  interpolationsPerSplineSegment = interpolationsPerSplineSegment || 25
  for (let i = 1; i < segmentTs.length; ++i) {
    const uMin = segmentTs[i - 1]
    const uMax = segmentTs[i]
    for (let k = 0; k <= interpolationsPerSplineSegment; ++k) {
      const u = k / interpolationsPerSplineSegment * (uMax - uMin) + uMin
      const t = (u - domain[0]) / (domain[1] - domain[0])
      const p = bSpline(t, degree, controlPointsForLib, knots)
      polyline.push(p)
    }
  }
  return polyline
}

toRadians = (degrees) => {
    return degrees * Math.PI / 180;
}

// Function to convert radians to degrees
toDegrees = (radians) => {
    return radians * 180 / Math.PI;
}

// Function to calculate the destination point given a starting point, bearing, and distance
calculateDestinationPoint = (lat1, lon1, bearing, distance) => {
    const R = 6371; // Earth's radius in kilometers
    const d = distance / R; // Angular distance in radians

    const lat1Rad = toRadians(lat1);
    const lon1Rad = toRadians(lon1);

    const lat2Rad = Math.asin(Math.sin(lat1Rad) * Math.cos(d) +
                            Math.cos(lat1Rad) * Math.sin(d) * Math.cos(bearing));
    const lon2Rad = lon1Rad + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1Rad),
                                     Math.cos(d) - Math.sin(lat1Rad) * Math.sin(lat2Rad));

    return [toDegrees(lat2Rad), toDegrees(lon2Rad)];
}

calculatePointC = (pointA, pointB, bearing=10) => {
    // Great-circle distance between A and B
    const R = 6371; // Earth's radius in kilometers
    const lat1Rad = toRadians(pointA[1]);
    const lon1Rad = toRadians(pointA[0]);
    const lat2Rad = toRadians(pointB[1]);
    const lon2Rad = toRadians(pointB[0]);

    const dLat = lat2Rad - lat1Rad;
    const dLon = lon2Rad - lon1Rad;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceAB = R * c; // in kilometers

    // Initial bearing from A to B
    const initialBearingAB = Math.atan2(Math.sin(lon2Rad - lon1Rad) * Math.cos(lat2Rad),
                                      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
                                      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad));

    const bearingAC = initialBearingAB + toRadians(-bearing);
    const bearingBC = initialBearingAB - toRadians(-bearing);

    // Assume a fixed distance for AC and BC.  This could be a parameter.
    const distanceAC = distanceAB * 0.5; // Example: Make it half the distance AB
    const distanceBC = distanceAB * 0.5;

    return calculateDestinationPoint(pointA[1], pointA[0], bearingAC, distanceAC);
}