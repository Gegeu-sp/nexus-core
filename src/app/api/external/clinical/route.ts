import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter (q)' }, { status: 400 });
  }

  try {
    // Clinical Tables API from National Library of Medicine (NIH) for ICD-10-CM
    // Documentation: https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html
    const url = `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(query)}&maxList=10`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NLM API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // NLM clinicaltables returns an array like: [ totalCount, codes, extraInfo, rawData ]
    // format [10, ["A00", "A01"], null, [["A00", "Cholera"], ["A01", "Typhoid"]]]
    const results: any[] = [];
    
    if (data && data[3] && Array.isArray(data[3])) {
      for (const item of data[3]) {
        results.push({
          code: item[0],
          name: item[1]
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error fetching clinical data from NLM:', error);
    return NextResponse.json({ error: 'Failed to fetch clinical data' }, { status: 500 });
  }
}
