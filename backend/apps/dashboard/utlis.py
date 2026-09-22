def custom_paginate(queryset, request, page_size=25):
    try:
        page = int(request.query_params.get('page', 1))
    except (TypeError, ValueError):
        page = 1
    
    try:
        size = int(request.query_params.get('page_size', page_size))
    except (TypeError, ValueError):
        size = page_size

    page = max(page, 1)

    count = queryset.count()
    start = (page - 1) * size
    end = start + size
    
    page_data = list(queryset[start:end])
    
    next_url = None
    previous_url = None
    
    if end < count:
        next_url = request.build_absolute_uri(f"?page={page + 1}&page_size={size}")
    if page > 1:
        previous_url = request.build_absolute_uri(f"?page={page - 1}&page_size={size}")
        
    return {
        "count": count,
        "next": next_url,
        "previous": previous_url,
        "results": page_data,
    }
