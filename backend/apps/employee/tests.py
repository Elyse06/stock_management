from django.test import SimpleTestCase, TestCase
from django.urls import resolve
from rest_framework.test import APIRequestFactory

from apps.employee.serializers import DirectionSerializer, EmployerSerializer, ServiceSerializer
from apps.employee.models import Direction, Employer, Service, Site
from apps.employee.views import (
	DirectionViewSet,
	EmployerViewSet,
	ServiceViewSet,
	SiteViewSet,
)
from apps.employee.views_import import ImportEmployeesView


class EmployeeImportRouteTests(SimpleTestCase):
	def test_import_route_is_not_captured_by_employee_detail_route(self):
		match = resolve("/api/employee/employee/import/")

		self.assertIs(match.func.view_class, ImportEmployeesView)


class EmployerSerializerTests(TestCase):
	def test_create_generates_emp_id_when_not_provided(self):
		serializer = EmployerSerializer(
			data={
				"emp_nom": "Employé Test",
				"emp_matricule": "MAT-12345",
				"emp_fonction": "Agent",
				"emp_contact": "",
				"emp_serv_id": None,
			}
		)

		self.assertTrue(serializer.is_valid(), serializer.errors)
		employee = serializer.save()

		self.assertEqual(employee.emp_id, "E12345")


class EmployerFilterTests(TestCase):
	def test_list_filters_by_organization_and_searches(self):
		site = Site.objects.create(
			site_nom="Siège", site_type="SIEGE", localite="Centre"
		)
		other_site = Site.objects.create(
			site_nom="Agence", site_type="AGENCE", localite="Nord"
		)
		direction = Direction.objects.create(
			dir_libelle="Direction", dir_description=""
		)
		other_direction = Direction.objects.create(
			dir_libelle="Autre direction", dir_description=""
		)
		service = Service.objects.create(
			serv_libelle="Service", serv_info="", serv_dir_id=direction
		)
		other_service = Service.objects.create(
			serv_libelle="Autre service", serv_info="", serv_dir_id=other_direction
		)
		employee = Employer.objects.create(
			emp_id="E00001",
			emp_nom="Employé recherché",
			emp_matricule="MAT-001",
			emp_fonction="Agent",
			emp_contact="",
		)
		Employer.objects.create(
			emp_id="E00002",
			emp_nom="Autre employé",
			emp_matricule="MAT-002",
			emp_fonction="Agent",
			emp_contact="",
		)
		Employer.objects.filter(pk=employee.pk).update(
			emp_site_id=site.pk,
			emp_dir_id=direction.pk,
			emp_serv_id=service.pk,
		)
		Employer.objects.filter(pk="E00002").update(
			emp_site_id=other_site.pk,
			emp_dir_id=other_direction.pk,
			emp_serv_id=other_service.pk,
		)

		request = APIRequestFactory().get(
			"/api/employee/employee/",
			{
				"search": "recherché",
				"emp_site_id": site.pk,
				"emp_dir_id": direction.pk,
				"emp_serv_id": service.pk,
			},
		)
		response = EmployerViewSet.as_view(
			{"get": "list"}, permission_classes=[]
		)(request)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["count"], 1)
		self.assertEqual(response.data["results"][0]["emp_id"], employee.pk)


class ServiceAndDirectionCountTests(TestCase):
	def test_service_filter_and_employee_count(self):
		direction = Direction.objects.create(
			dir_libelle="Direction A", dir_description=""
		)
		other_direction = Direction.objects.create(
			dir_libelle="Direction B", dir_description=""
		)
		service = Service.objects.create(
			serv_libelle="Service A", serv_info="", serv_dir_id=direction
		)
		Service.objects.create(
			serv_libelle="Service B", serv_info="", serv_dir_id=other_direction
		)
		employee = Employer.objects.create(
			emp_id="E00003",
			emp_nom="Employé A",
			emp_matricule="MAT-003",
			emp_fonction="Agent",
			emp_contact="",
		)
		Employer.objects.filter(pk=employee.pk).update(
			emp_dir_id=direction.pk,
			emp_serv_id=service.pk,
		)

		request = APIRequestFactory().get(
			"/api/employee/service/",
			{"serv_dir_id": direction.pk},
		)
		response = ServiceViewSet.as_view(
			{"get": "list"}, permission_classes=[]
		)(request)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["count"], 1)
		self.assertEqual(response.data["results"][0]["serv_id"], service.pk)
		self.assertEqual(response.data["results"][0]["employees_count"], 1)

	def test_direction_search_returns_service_and_employee_counts(self):
		direction = Direction.objects.create(
			dir_libelle="Direction recherchée", dir_description=""
		)
		service = Service.objects.create(
			serv_libelle="Service A", serv_info="", serv_dir_id=direction
		)
		employee = Employer.objects.create(
			emp_id="E00004",
			emp_nom="Employé A",
			emp_matricule="MAT-004",
			emp_fonction="Agent",
			emp_contact="",
		)
		Employer.objects.filter(pk=employee.pk).update(
			emp_dir_id=direction.pk,
			emp_serv_id=service.pk,
		)

		request = APIRequestFactory().get(
			"/api/employee/direction/",
			{"search": "recherchée"},
		)
		response = DirectionViewSet.as_view(
			{"get": "list"}, permission_classes=[]
		)(request)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["count"], 1)
		self.assertEqual(response.data["results"][0]["dir_id"], direction.pk)
		self.assertEqual(response.data["results"][0]["services_count"], 1)
		self.assertEqual(response.data["results"][0]["employees_count"], 1)


class SiteFilterAndCountTests(TestCase):
	def test_site_filter_search_and_counts(self):
		site = Site.objects.create(
			site_nom="Agence Nord", site_type="AGENCE", localite="Nord"
		)
		other_site = Site.objects.create(
			site_nom="Siège", site_type="SIEGE", localite="Centre"
		)
		direction = Direction.objects.create(
			dir_libelle="Direction Nord", dir_description=""
		)
		service = Service.objects.create(
			serv_libelle="Service Nord", serv_info="", serv_dir_id=direction
		)
		employee = Employer.objects.create(
			emp_id="E00005",
			emp_nom="Employé Nord",
			emp_matricule="MAT-005",
			emp_fonction="Agent",
			emp_contact="",
		)
		Employer.objects.filter(pk=employee.pk).update(
			emp_site_id=site.pk,
			emp_dir_id=direction.pk,
			emp_serv_id=service.pk,
		)

		request = APIRequestFactory().get(
			"/api/employee/sites/",
			{"site_type": "AGENCE", "search": "Nord"},
		)
		response = SiteViewSet.as_view(
			{"get": "list"}, permission_classes=[]
		)(request)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["count"], 1)
		self.assertEqual(response.data["results"][0]["site_id"], site.pk)
		self.assertEqual(response.data["results"][0]["employees_count"], 1)
		self.assertEqual(response.data["results"][0]["directions_count"], 1)


class DirectionAndServiceIdTests(TestCase):
	def test_direction_ids_are_generated_sequentially(self):
		for index in range(1, 3):
			serializer = DirectionSerializer(
				data={"dir_libelle": f"Direction {index}", "dir_description": ""}
			)
			self.assertTrue(serializer.is_valid(), serializer.errors)
			self.assertEqual(serializer.save().dir_id, str(index))

	def test_service_ids_are_generated_sequentially(self):
		direction = DirectionSerializer(
			data={"dir_libelle": "Direction", "dir_description": ""}
		)
		self.assertTrue(direction.is_valid(), direction.errors)
		direction_id = direction.save().dir_id

		for index in range(1, 3):
			serializer = ServiceSerializer(
				data={
					"serv_libelle": f"Service {index}",
					"serv_info": "",
					"serv_dir_id": direction_id,
				}
			)
			self.assertTrue(serializer.is_valid(), serializer.errors)
			self.assertEqual(serializer.save().serv_id, str(index))


class EmployerOrganizationTests(TestCase):
	def test_employee_can_be_assigned_to_site_without_direction_or_service(self):
		site = Site.objects.create(
			site_nom="Siège", site_type="SIEGE", localite="Centre"
		)
		employer = Employer.objects.create(
			emp_nom="Direction générale",
			emp_matricule="MAT-DG",
			emp_fonction="Directeur général",
			emp_contact="",
			emp_site_id=site,
		)

		self.assertEqual(employer.emp_site_id, site)
		self.assertIsNone(employer.emp_dir_id)
		self.assertIsNone(employer.emp_serv_id)
		self.assertEqual(employer.site, site)

	def test_service_assignment_synchronizes_direction_without_site_relation(self):
		direction = Direction.objects.create(
			dir_libelle="Direction", dir_description=""
		)
		service = Service.objects.create(
			serv_libelle="Service", serv_info="", serv_dir_id=direction
		)
		employer = Employer.objects.create(
			emp_nom="Employé",
			emp_matricule="MAT-EMP",
			emp_fonction="Agent",
			emp_contact="",
			emp_serv_id=service,
		)

		self.assertEqual(employer.emp_dir_id, direction)
		self.assertIsNone(employer.emp_site_id)
