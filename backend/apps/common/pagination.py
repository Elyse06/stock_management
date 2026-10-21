from django.core.paginator import EmptyPage, Paginator
from rest_framework.pagination import PageNumberPagination

from .params import parse_int

PAGE_SIZE_MAX = 100


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = PAGE_SIZE_MAX


def _url_page(request, page, size):
    params = request.query_params.copy()
    params["page"] = page
    params["page_size"] = size
    return request.build_absolute_uri(f"{request.path}?{params.urlencode()}")


def paginer(queryset, request, page_size=25, max_page_size=PAGE_SIZE_MAX):
    size = parse_int(request.query_params.get("page_size"), default=page_size, minimum=1)
    size = min(size, max_page_size)
    numero = parse_int(request.query_params.get("page"), default=1, minimum=1)

    paginator = Paginator(queryset, size)
    try:
        page = paginator.page(numero)
    except EmptyPage:
        return {"count": paginator.count, "next": None, "previous": None, "results": []}

    return {
        "count": paginator.count,
        "next": _url_page(request, numero + 1, size) if page.has_next() else None,
        "previous": _url_page(request, numero - 1, size) if page.has_previous() else None,
        "results": list(page.object_list),
    }
