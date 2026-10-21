import { NextRequest, NextResponse } from 'next/server';
import { localDb } from '@/lib/db/local-store';
import { getCurrentUser } from '@/lib/auth/session';
import { analyzePriorityAndClassification } from '@/lib/ai/intelligence';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const priority = searchParams.get('priority') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const assignedStaffId = searchParams.get('assignedStaffId') || undefined;

    const complaints = await localDb.getComplaints({
      category,
      status,
      priority,
      studentId,
      assignedStaffId,
    });

    return NextResponse.json({ success: true, complaints });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch complaints';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const {
      title,
      description,
      category,
      campusZone,
      locationDetails,
      imageUrl,
      isAnonymous,
    } = body;

    if (!title || !description || !category || !campusZone || !locationDetails) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please fill in all required complaint fields (title, description, category, campusZone, locationDetails).',
        },
        { status: 400 }
      );
    }

    // Run AI analysis for explainable priority scoring & department recommendation
    const aiAnalysis = analyzePriorityAndClassification(title, description, category, campusZone);

    const newComplaint = await localDb.createComplaint({
      title: title.trim(),
      description: description.trim(),
      category,
      campusZone,
      locationDetails,
      imageUrl: imageUrl || undefined,
      status: 'submitted',
      priority: aiAnalysis.priority,
      priorityScore: aiAnalysis.score,
      priorityReasons: aiAnalysis.reasons,
      assignedDepartment: aiAnalysis.suggestedDepartment,
      studentId: user.id,
      studentName: isAnonymous ? 'Anonymous Student' : user.fullName,
      isAnonymous: !!isAnonymous,
      humanReviewRequired: aiAnalysis.humanReviewRequired,
      pointsAwardedTriage: false,
      pointsAwardedResolution: false,
    });

    return NextResponse.json({ success: true, complaint: newComplaint, aiAnalysis }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create complaint';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
