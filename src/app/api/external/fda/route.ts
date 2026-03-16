import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter (q)' }, { status: 400 });
  }

  try {
    // OpenFDA Drug API
    // Documentation: https://open.fda.gov/apis/drug/ndc/
    // We search across brand_name and generic_name
    const url = `https://api.fda.gov/drug/ndc.json?search=brand_name:"${encodeURIComponent(query)}"+generic_name:"${encodeURIComponent(query)}"&limit=10`;
    
    const response = await fetch(url);
    
    // OpenFDA returns 404 if no results are found, handle it gracefully
    if (response.status === 404) {
       return NextResponse.json({ results: [] });
    }
    
    if (!response.ok) {
      throw new Error(`OpenFDA API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const results: any[] = [];
    
    if (data && data.results && Array.isArray(data.results)) {
      // Use a Set to avoid duplicates based on generic/brand names
      const seen = new Set();
      
      for (const item of data.results) {
        const brandName = item.brand_name || 'Unknown';
        const genericName = item.generic_name || brandName;
        const key = `${brandName}-${genericName}`.toLowerCase();
        
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            brand_name: brandName,
            generic_name: genericName,
            dosage_form: item.dosage_form || 'Unknown form',
            active_ingredients: item.active_ingredients ? item.active_ingredients.map((ai: any) => ({
                name: ai.name,
                strength: ai.strength
            })) : []
          });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching data from OpenFDA:', error);
    return NextResponse.json({ error: 'Failed to fetch pharmacological data' }, { status: 500 });
  }
}
