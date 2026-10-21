import { NextRequest, NextResponse } from 'next/server';
import { analyzePriorityAndClassification } from '@/lib/ai/intelligence';
import { ComplaintCategory } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, category, campusZone } = body;

    const analysis = analyzePriorityAndClassification(
      title || '',
      description || '',
      (category as ComplaintCategory) || 'infrastructure',
      campusZone || 'Campus Central'
    );

    return NextResponse.json({ success: true, analysis });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI priority analysis failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
