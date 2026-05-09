exports.handler = async function(event) {
  const { lat, lng } = event.queryStringParameters || {};
  if (!lat || !lng) {
    return { statusCode: 400, body: JSON.stringify({ error: 'lat and lng required' }) };
  }

  const sql = `SELECT TOP 1 co.compname, co.hydgrp, co.drainagecl, ch.om_r, ch.texture
    FROM mapunit mu
    INNER JOIN component co ON mu.mukey = co.mukey
    INNER JOIN chorizon ch ON co.cokey = ch.cokey
    WHERE mu.mukey IN (
      SELECT mukey FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('POINT(${parseFloat(lng).toFixed(5)} ${parseFloat(lat).toFixed(5)})')
    )
    AND co.majcompflag = 'Yes' AND ch.hzdept_r = 0
    ORDER BY co.comppct_r DESC`;

  try {
    const res = await fetch('https://SDMDataAccess.sc.egov.usda.gov/Tabular/SDMTabularService/post.rest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'query=' + encodeURIComponent(sql) + '&format=JSON'
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      // SDA returned XML (error response) — log it and return empty
      console.error('SDA non-JSON response:', text.slice(0, 500));
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Table: [] }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch(e) {
    console.error('soil-lookup error:', e.message);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Table: [] }) };
  }
};
