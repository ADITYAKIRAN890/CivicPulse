import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { findDuplicateSuggestions } from '@/lib/ai/intelligence';
import { ComplaintCategory } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, category, campusZone } = body;

    if (!title && !description) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    const allComplaints = await localDb.getComplaints();
    const suggestions = findDuplicateSuggestions(
      title || '',
      description || '',
      (category as ComplaintCategory) || 'infrastructure',
      campusZone || 'General Campus',
      allComplaints
    );

    return NextResponse.json({
      success: true,
      suggestions,
      totalDuplicatesFound: suggestions.length,
      highestSimilarity: suggestions[0]?.similarityScore || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI similarity check failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
